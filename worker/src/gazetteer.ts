import type { Level, LookupMatch, PostalLookup, PostalQuery, PostalRecord, Region, SourceMetadata } from './types'

export interface Gazetteer {
  ping(): Promise<void>
  lookup(level: Level, normalized: string): Promise<LookupMatch[]>
  children(parentCode: string, level: Level): Promise<Region[]>
  listLevel(level: Level): Promise<Region[]>
  ancestors(code: string): Promise<Region[]>
  lookupPostal(query: PostalQuery): Promise<PostalLookup>
  postalCodes(regionCode: string): Promise<string[]>
  version(): Promise<string>
  sources(): Promise<SourceMetadata[]>
}

interface RegionRow {
  code: string
  level: Level
  kind: string
  parent_code: string
  parent_name: string
  name: string
}

interface LookupRow extends RegionRow {
  alias: number
}

interface PostalRow {
  code: string
  village: string
  district: string
  regency: string
  province: string
  latitude: number
  longitude: number
  elevation: number
  timezone: PostalRecord['timezone']
  village_region_code: string | null
}

export class D1Gazetteer implements Gazetteer {
  constructor(private readonly db: D1Database) {}

  async ping(): Promise<void> {
    await this.db.prepare('SELECT 1 AS ok').first('ok')
  }

  async lookup(level: Level, normalized: string): Promise<LookupMatch[]> {
    const result = await this.db.prepare(`
      SELECT r.code, r.level, r.kind, COALESCE(r.parent_code, '') AS parent_code,
             COALESCE(p.name, '') AS parent_name, r.name, 0 AS alias
      FROM regions r LEFT JOIN regions p ON p.code = r.parent_code
      WHERE r.level = ? AND r.normalized_name = ?
      UNION
      SELECT r.code, r.level, r.kind, COALESCE(r.parent_code, '') AS parent_code,
             COALESCE(p.name, '') AS parent_name, r.name, 1 AS alias
      FROM region_aliases a JOIN regions r ON r.code = a.region_code
      LEFT JOIN regions p ON p.code = r.parent_code
      WHERE r.level = ? AND a.normalized_alias = ?
      ORDER BY 1
    `).bind(level, normalized, level, normalized).all<LookupRow>()
    return result.results.map((row) => ({ region: regionFromRow(row), alias: row.alias === 1 }))
  }

  async children(parentCode: string, level: Level): Promise<Region[]> {
    return this.queryRegions(`
      SELECT r.code, r.level, r.kind, COALESCE(r.parent_code, '') AS parent_code,
             COALESCE(p.name, '') AS parent_name, r.name
      FROM regions r LEFT JOIN regions p ON p.code = r.parent_code
      WHERE r.parent_code = ? AND r.level = ? ORDER BY r.name
    `, parentCode, level)
  }

  async listLevel(level: Level): Promise<Region[]> {
    return this.queryRegions(`
      SELECT r.code, r.level, r.kind, COALESCE(r.parent_code, '') AS parent_code,
             COALESCE(p.name, '') AS parent_name, r.name
      FROM regions r LEFT JOIN regions p ON p.code = r.parent_code
      WHERE r.level = ? ORDER BY r.name
    `, level)
  }

  async ancestors(code: string): Promise<Region[]> {
    return this.queryRegions(`
      WITH RECURSIVE ancestors(code, level, kind, parent_code, name) AS (
        SELECT code, level, kind, parent_code, name FROM regions WHERE code = ?
        UNION ALL
        SELECT r.code, r.level, r.kind, r.parent_code, r.name
        FROM regions r JOIN ancestors a ON r.code = a.parent_code
      )
      SELECT a.code, a.level, a.kind, COALESCE(a.parent_code, '') AS parent_code,
             COALESCE(p.name, '') AS parent_name, a.name
      FROM ancestors a LEFT JOIN regions p ON p.code = a.parent_code WHERE a.code <> ?
    `, code, code)
  }

  async postalCodes(regionCode: string): Promise<string[]> {
    const result = await this.db.prepare(
      'SELECT DISTINCT code AS postal_code FROM postal_codes WHERE village_region_code = ? ORDER BY code',
    ).bind(regionCode).all<{ postal_code: string }>()
    return result.results.map((row) => row.postal_code)
  }

  async lookupPostal(query: PostalQuery): Promise<PostalLookup> {
    const filters: string[] = []
    const values: string[] = []
    if (query.code) {
      filters.push('code = ?')
      values.push(query.code)
    }
    if (query.village) {
      filters.push('normalized_village = ?')
      values.push(normalizeComparableName(query.village))
    }
    if (query.district) {
      filters.push('normalized_district = ?')
      values.push(normalizeComparableName(query.district))
    }
    if (query.regency) {
      filters.push('normalized_regency = ?')
      values.push(normalizeComparableName(query.regency))
    }
    if (query.province) {
      filters.push('normalized_province = ?')
      values.push(normalizeComparableName(query.province))
    }
    if (!query.code && !query.village && !query.district && !query.regency) return { records: [], truncated: false }
    const result = await this.db.prepare(`
      SELECT code, village, district, regency, province, latitude, longitude,
             elevation, timezone, village_region_code
      FROM postal_codes WHERE ${filters.join(' AND ')}
      ORDER BY province, regency, district, village, code LIMIT 101
    `).bind(...values).all<PostalRow>()
    return {
      records: result.results.slice(0, 100).map((row) => ({
        code: row.code,
        village: row.village,
        district: row.district,
        regency: row.regency,
        province: row.province,
        latitude: row.latitude,
        longitude: row.longitude,
        elevation: row.elevation,
        timezone: row.timezone,
        villageRegionCode: row.village_region_code,
      })),
      truncated: result.results.length > 100,
    }
  }

  async version(): Promise<string> {
    const value = await this.db.prepare(
      "SELECT commit_hash FROM source_metadata WHERE source_role = 'machine_readable_primary' ORDER BY id LIMIT 1",
    ).first<string>('commit_hash')
    if (!value) throw new Error('gazetteer source metadata is missing')
    return value
  }

  async sources(): Promise<SourceMetadata[]> {
    const result = await this.db.prepare(`
      SELECT source_name, source_role, commit_hash, license, record_count
      FROM source_metadata ORDER BY id
    `).all<SourceMetadata>()
    return result.results
  }

  private async queryRegions(query: string, ...values: unknown[]): Promise<Region[]> {
    const result = await this.db.prepare(query).bind(...values).all<RegionRow>()
    return result.results.map(regionFromRow)
  }
}

export function normalizeName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('id-ID')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function normalizeComparableName(value: string): string {
  return normalizeName(value).replace(/^(provinsi|kabupaten|kota|kecamatan|kelurahan|desa)\s+/, '')
}

function regionFromRow(row: RegionRow): Region {
  return {
    code: row.code,
    level: row.level,
    kind: row.kind,
    parentCode: row.parent_code,
    parentName: row.parent_name,
    name: row.name,
  }
}
