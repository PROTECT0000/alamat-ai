import { publicAddress, signalCount } from './address'
import { normalizeName, type Gazetteer } from './gazetteer'
import type {
  Address,
  AdminMatch,
  AdminValidation,
  Candidate,
  ExtractedAddress,
  Issue,
  IssueCode,
  Level,
  LookupMatch,
  MatchType,
  Region,
  ValidationResult,
} from './types'

const levels: Level[] = ['province', 'city', 'district', 'village']
const fieldByLevel: Record<Level, keyof AdminValidation> = {
  province: 'provinsi',
  city: 'kabupaten_kota',
  district: 'kecamatan',
  village: 'desa_kelurahan',
}

interface Unresolved {
  input: string
  candidates: LookupMatch[]
  unknown: boolean
}

interface FuzzyMatch {
  region: Region
  score: number
}

export class Validator {
  constructor(
    private readonly repository: Gazetteer,
    private readonly fuzzyThreshold: number,
  ) {}

  async validate(extracted: ExtractedAddress): Promise<ValidationResult> {
    const address = publicAddress(extracted)
    const inputs = new Map<Level, string | null>([
      ['province', address.provinsi],
      ['city', address.kabupaten_kota],
      ['district', address.kecamatan],
      ['village', address.desa_kelurahan],
    ])
    const admin = emptyAdmin(inputs)
    if (!extracted.is_address && signalCount(address) === 0) {
      return {
        status: 'invalid',
        admin,
        issues: [issue('NON_ADDRESS_INPUT', null, 'error', 'Teks tidak tampak sebagai alamat.')],
      }
    }

    const unresolved = new Map<Level, Unresolved>()
    const resolved = new Map<Level, Region>()
    const issues: Issue[] = []

    for (const level of levels) {
      const input = inputs.get(level)
      if (!input) continue
      let matches = await this.repository.lookup(level, normalizeName(input))
      matches = filterByResolvedParent(level, matches, resolved)
      if (matches.length === 0) {
        const fuzzy = await this.fuzzyMatches(level, input, resolved)
        if (fuzzy.length === 1) {
          resolved.set(level, fuzzy[0].region)
          admin[fieldByLevel[level]] = adminFromRegion(input, fuzzy[0].region, 'fuzzy', fuzzy[0].score)
        } else {
          unresolved.set(level, {
            input,
            candidates: fuzzy.map((match) => ({ region: match.region, alias: false })),
            unknown: fuzzy.length === 0,
          })
        }
        continue
      }
      if (matches.length === 1) {
        const match = matches[0]
        resolved.set(level, match.region)
        admin[fieldByLevel[level]] = adminFromRegion(input, match.region, match.alias ? 'alias' : 'exact', 1)
        continue
      }
      unresolved.set(level, { input, candidates: matches, unknown: false })
    }

    await inferAndCheck(this.repository, inputs, resolved, admin, issues)
    for (const [level, pending] of unresolved) {
      const inferred = resolved.get(level)
      if (inferred && pending.candidates.some((candidate) => candidate.region.code === inferred.code)) {
        const candidate = pending.candidates.find((item) => item.region.code === inferred.code)
        admin[fieldByLevel[level]] = adminFromRegion(pending.input, inferred, candidate?.alias ? 'alias' : 'exact', 1)
        continue
      }
      const field = fieldByLevel[level]
      if (pending.unknown) {
        issues.push(issue('UNKNOWN_REGION', field, 'warning', `Wilayah ${pending.input} tidak ditemukan di gazetteer.`))
      } else {
        issues.push(issue(
          'AMBIGUOUS_REGION',
          field,
          'warning',
          `${pending.input} dapat merujuk ke lebih dari satu wilayah.`,
          candidates(pending.candidates),
        ))
      }
    }

    addMissingIssues(address, admin, issues)
    await addPostalIssue(this.repository, address, resolved, issues)
    const needsClarification = issues.some((item) => !['POSTAL_CODE_MISMATCH', 'POSTAL_CODE_UNKNOWN'].includes(item.code))
    return { status: needsClarification ? 'needs_clarification' : 'valid', admin, issues }
  }

  private async fuzzyMatches(level: Level, input: string, resolved: Map<Level, Region>): Promise<FuzzyMatch[]> {
    let pool: Region[] = []
    const parent = parentLevel(level)
    if (parent && resolved.has(parent)) {
      pool = await this.repository.children(resolved.get(parent)!.code, level)
    } else if (level === 'province' || level === 'city') {
      pool = await this.repository.listLevel(level)
    }
    if (pool.length === 0) return []

    const normalized = normalizeName(input)
    let best = 0
    let matches: FuzzyMatch[] = []
    for (const region of pool) {
      const score = similarity(normalized, normalizeName(region.name))
      if (score < this.fuzzyThreshold) continue
      if (score > best + 0.02) {
        best = score
        matches = [{ region, score }]
      } else if (Math.abs(score - best) <= 0.02) {
        matches.push({ region, score })
      }
    }
    return matches.sort((a, b) => a.region.code.localeCompare(b.region.code)).slice(0, 5)
  }
}

async function inferAndCheck(
  repository: Gazetteer,
  inputs: Map<Level, string | null>,
  resolved: Map<Level, Region>,
  admin: AdminValidation,
  issues: Issue[],
): Promise<void> {
  for (let index = levels.length - 1; index >= 0; index--) {
    const level = levels[index]
    const region = resolved.get(level)
    if (!region) continue
    for (const ancestor of await repository.ancestors(region.code)) {
      const current = resolved.get(ancestor.level)
      if (current && current.code !== ancestor.code) {
        if (!hasIssue(issues, 'HIERARCHY_MISMATCH', fieldByLevel[level])) {
          issues.push(issue(
            'HIERARCHY_MISMATCH',
            fieldByLevel[level],
            'error',
            `${region.name} tidak berada di bawah ${current.name}.`,
          ))
        }
      } else if (!current) {
        resolved.set(ancestor.level, ancestor)
        admin[fieldByLevel[ancestor.level]] = adminFromRegion(inputs.get(ancestor.level) ?? null, ancestor, 'inferred', 1)
      }
    }
  }
}

function addMissingIssues(address: Address, admin: AdminValidation, issues: Issue[]): void {
  for (const field of ['jalan', 'nomor'] as const) {
    if (address[field] === null) issues.push(issue('MISSING_FIELD', field, 'warning', `Field ${field} belum disebutkan.`))
  }
  for (const level of ['village', 'district', 'city', 'province'] as Level[]) {
    const field = fieldByLevel[level]
    if (admin[field].code === null && !hasIssue(issues, 'UNKNOWN_REGION', field) && !hasIssue(issues, 'AMBIGUOUS_REGION', field)) {
      issues.push(issue('MISSING_FIELD', field, 'warning', `Field ${field} belum disebutkan.`))
    }
  }
}

async function addPostalIssue(
  repository: Gazetteer,
  address: Address,
  resolved: Map<Level, Region>,
  issues: Issue[],
): Promise<void> {
  if (!address.kode_pos || !resolved.has('village')) return
  const codes = await repository.postalCodes(resolved.get('village')!.code)
  if (codes.length === 0) {
    issues.push(issue('POSTAL_CODE_UNKNOWN', 'kode_pos', 'info', 'Kode pos belum tersedia pada enrichment gazetteer.'))
  } else if (!codes.includes(address.kode_pos)) {
    issues.push(issue('POSTAL_CODE_MISMATCH', 'kode_pos', 'warning', 'Kode pos tidak cocok dengan desa/kelurahan yang terselesaikan.'))
  }
}

function filterByResolvedParent(level: Level, matches: LookupMatch[], resolved: Map<Level, Region>): LookupMatch[] {
  const parent = parentLevel(level)
  if (!parent || !resolved.has(parent) || matches.length <= 1) return matches
  const filtered = matches.filter((match) => match.region.parentCode === resolved.get(parent)!.code)
  return filtered.length > 0 ? filtered : matches
}

function emptyAdmin(inputs: Map<Level, string | null>): AdminValidation {
  const empty = (level: Level): AdminMatch => ({ input: inputs.get(level) ?? null, code: null, name: null, match: 'none', score: 0 })
  return {
    desa_kelurahan: empty('village'),
    kecamatan: empty('district'),
    kabupaten_kota: empty('city'),
    provinsi: empty('province'),
  }
}

function adminFromRegion(input: string | null, region: Region, match: MatchType, score: number): AdminMatch {
  return { input, code: region.code, name: region.name, match, score }
}

function candidates(matches: LookupMatch[]): Candidate[] {
  return matches.slice(0, 5).map(({ region }) => ({
    code: region.code,
    name: region.name,
    parent: region.parentName || null,
  }))
}

function issue(
  code: IssueCode,
  field: string | null,
  severity: Issue['severity'],
  message: string,
  values: Candidate[] = [],
): Issue {
  return { code, field, severity, message, candidates: values }
}

function hasIssue(issues: Issue[], code: IssueCode, field: string): boolean {
  return issues.some((item) => item.code === code && item.field === field)
}

function parentLevel(level: Level): Level | null {
  if (level === 'city') return 'province'
  if (level === 'district') return 'city'
  if (level === 'village') return 'district'
  return null
}

export function similarity(a: string, b: string): number {
  const left = Array.from(a)
  const right = Array.from(b)
  if (left.length === 0 && right.length === 0) return 1
  return 1 - levenshtein(left, right) / Math.max(left.length, right.length)
}

function levenshtein(left: string[], right: string[]): number {
  const matrix = Array.from({ length: right.length + 1 }, (_, row) =>
    Array.from({ length: left.length + 1 }, (_, column) => row === 0 ? column : column === 0 ? row : 0),
  )
  for (let row = 1; row <= right.length; row++) {
    for (let column = 1; column <= left.length; column++) {
      const cost = left[column - 1] === right[row - 1] ? 0 : 1
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      )
      if (row > 1 && column > 1 && left[column - 1] === right[row - 2] && left[column - 2] === right[row - 1]) {
        matrix[row][column] = Math.min(matrix[row][column], matrix[row - 2][column - 2] + 1)
      }
    }
  }
  return matrix[right.length][left.length]
}
