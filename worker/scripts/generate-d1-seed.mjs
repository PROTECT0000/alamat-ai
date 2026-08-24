import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const workerRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(workerRoot, '..')
const sourcePath = resolve(repositoryRoot, 'data/raw/wilayah.sql')
const checksumPath = resolve(repositoryRoot, 'data/raw/wilayah.sql.sha256')
const commitPath = resolve(repositoryRoot, 'data/raw/wilayah.COMMIT')
const postalChecksumPath = resolve(repositoryRoot, 'data/raw/kodepos.json.sha256')
const postalCommitPath = resolve(repositoryRoot, 'data/raw/kodepos.COMMIT')
const outputPath = resolve(workerRoot, '.generated/gazetteer-seed.sql')
const verifyOnly = process.argv.includes('--verify-only')

const source = await readFile(sourcePath)
const expectedChecksum = (await readFile(checksumPath, 'utf8')).trim().split(/\s+/, 1)[0]
const actualChecksum = createHash('sha256').update(source).digest('hex')
if (actualChecksum !== expectedChecksum) {
  throw new Error(`wilayah.sql checksum mismatch: got ${actualChecksum}, expected ${expectedChecksum}`)
}

const regions = parseWilayahSql(source.toString('utf8'))
verifyRegions(regions)
const aliases = regions.flatMap((region) => systematicAliases(region).map((alias) => ({ code: region.code, alias })))
const postalCommit = (await readFile(postalCommitPath, 'utf8')).trim()
const postalUrl = `https://raw.githubusercontent.com/sooluh/kodepos/${postalCommit}/data/kodepos.json`
const postalResponse = await fetch(postalUrl)
if (!postalResponse.ok) throw new Error(`kodepos download failed with HTTP ${postalResponse.status}`)
const postalSource = Buffer.from(await postalResponse.arrayBuffer())
const expectedPostalChecksum = (await readFile(postalChecksumPath, 'utf8')).trim().split(/\s+/, 1)[0]
const actualPostalChecksum = createHash('sha256').update(postalSource).digest('hex')
if (actualPostalChecksum !== expectedPostalChecksum) {
  throw new Error(`kodepos.json checksum mismatch: got ${actualPostalChecksum}, expected ${expectedPostalChecksum}`)
}
const postalCodes = mapPostalRegions(parsePostalJson(postalSource.toString('utf8')), regions)

const counts = countByLevel(regions)
const mappedPostalCodes = postalCodes.filter((record) => record.villageRegionCode !== null).length
console.log(`gazetteer verified: ${counts.province}/${counts.city}/${counts.district}/${counts.village}, zero orphans, zero duplicates, ${aliases.length} aliases`)
console.log(`postal enrichment verified: ${postalCodes.length} rows, ${new Set(postalCodes.map((record) => record.code)).size} distinct codes, ${mappedPostalCodes} village mappings`)

if (!verifyOnly) {
  const commitHash = (await readFile(commitPath, 'utf8')).trim()
  const statements = [
    'PRAGMA defer_foreign_keys = TRUE;',
    'DELETE FROM postal_codes;',
    'DELETE FROM region_aliases;',
    'DELETE FROM regions;',
    'DELETE FROM source_metadata;',
    ...batchedInsert(
      'regions(code, level, kind, parent_code, name, normalized_name)',
      regions.map((region) => [region.code, region.level, region.kind, region.parentCode || null, region.name, normalizeName(region.name)]),
    ),
    ...batchedInsert(
      'region_aliases(region_code, normalized_alias, alias_type)',
      aliases.map(({ code, alias }) => [code, alias, 'systematic']),
      'INSERT OR IGNORE',
    ),
    ...batchedInsert(
      'postal_codes(code, village, normalized_village, district, normalized_district, regency, normalized_regency, province, normalized_province, latitude, longitude, elevation, timezone, village_region_code, source_role)',
      postalCodes.map((record) => [
        record.code,
        record.village,
        record.normalizedVillage,
        record.district,
        record.normalizedDistrict,
        record.regency,
        record.normalizedRegency,
        record.province,
        record.normalizedProvince,
        record.latitude,
        record.longitude,
        record.elevation,
        record.timezone,
        record.villageRegionCode,
        'enrichment',
      ]),
    ),
    `INSERT INTO source_metadata(id, source_name, source_url, commit_hash, license, regulation_version, source_role, record_count, build_timestamp, notes) VALUES
      (1, 'Kepmendagri', 'https://www.kemendagri.go.id/', 'not-applicable', 'public document', 'Kepmendagri No. 300.2.2-2138 Tahun 2025', 'official_benchmark', ${regions.length}, '2026-02-13T16:45:21Z', 'Official count benchmark; machine-readable rows are from the separately identified source.'),
      (2, 'cahyadsn/wilayah', 'https://github.com/cahyadsn/wilayah', ${sqlValue(commitHash)}, 'MIT', 'Kepmendagri No. 300.2.2-2138 Tahun 2025', 'machine_readable_primary', ${regions.length}, '2026-02-13T16:45:21Z', 'Community-maintained machine-readable mirror; not described as authoritative.'),
      (3, 'sooluh/kodepos', 'https://github.com/sooluh/kodepos/raw/refs/heads/main/data/kodepos.json', ${sqlValue(postalCommit)}, 'Apache-2.0', NULL, 'enrichment', ${postalCodes.length}, '2026-08-24T00:00:00Z', 'Pinned postal-code, locality, coordinate, elevation, and timezone enrichment. Postal codes are not unique.');`,
    'PRAGMA optimize;',
    '',
  ]
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, statements.join('\n'), 'utf8')
  console.log(`D1 seed written to ${outputPath}`)
}

function parseWilayahSql(text) {
  const regions = []
  for (let offset = 0; offset < text.length;) {
    const tuple = text.indexOf("('", offset)
    if (tuple < 0) break
    const codeValue = parseSqlString(text, tuple + 1)
    if (!codeValue || !/^\d{2}(\.\d{2}){0,2}(\.\d{4})?$/.test(codeValue.value)) {
      offset = tuple + 2
      continue
    }
    let nameOffset = codeValue.next
    while ([',', ' ', '\t'].includes(text[nameOffset])) nameOffset++
    const nameValue = parseSqlString(text, nameOffset)
    if (!nameValue) throw new Error(`invalid SQL name literal near byte ${nameOffset}`)
    regions.push(regionFromCode(codeValue.value, nameValue.value))
    offset = nameValue.next
  }
  if (regions.length === 0) throw new Error('no wilayah rows found')
  return regions
}

function parsePostalJson(text) {
  const value = JSON.parse(text)
  if (!Array.isArray(value) || value.length !== 83761) {
    throw new Error(`kodepos row count = ${Array.isArray(value) ? value.length : 'not-an-array'}, expected 83761`)
  }
  return value.map((row, index) => {
    if (!row || typeof row !== 'object') throw new Error(`kodepos row ${index} is not an object`)
    const code = String(row.code)
    for (const field of ['village', 'district', 'regency', 'province', 'timezone']) {
      if (typeof row[field] !== 'string' || !row[field].trim()) throw new Error(`kodepos row ${index} has invalid ${field}`)
    }
    for (const field of ['latitude', 'longitude', 'elevation']) {
      if (typeof row[field] !== 'number' || !Number.isFinite(row[field])) throw new Error(`kodepos row ${index} has invalid ${field}`)
    }
    if (!/^\d{5}$/.test(code)) throw new Error(`kodepos row ${index} has invalid code`)
    if (!['WIB', 'WITA', 'WIT'].includes(row.timezone)) throw new Error(`kodepos row ${index} has invalid timezone`)
    return {
      code,
      village: row.village.trim(),
      normalizedVillage: normalizeName(row.village),
      district: row.district.trim(),
      normalizedDistrict: normalizeName(row.district),
      regency: row.regency.trim(),
      normalizedRegency: normalizeName(row.regency),
      province: row.province.trim(),
      normalizedProvince: normalizeName(row.province),
      latitude: row.latitude,
      longitude: row.longitude,
      elevation: row.elevation,
      timezone: row.timezone,
      villageRegionCode: null,
    }
  })
}

function mapPostalRegions(postalCodes, regions) {
  const byCode = new Map(regions.map((region) => [region.code, region]))
  const villagesByName = new Map()
  for (const region of regions) {
    if (region.level !== 'village') continue
    const key = comparableName(region.name)
    villagesByName.set(key, [...(villagesByName.get(key) ?? []), region])
  }
  return postalCodes.map((postal) => {
    const matches = (villagesByName.get(comparableName(postal.village)) ?? []).filter((village) => {
      const district = byCode.get(village.parentCode)
      const city = district ? byCode.get(district.parentCode) : null
      const province = city ? byCode.get(city.parentCode) : null
      return district && city && province
        && comparableName(district.name) === comparableName(postal.district)
        && comparableName(city.name) === comparableName(postal.regency)
        && comparableName(province.name) === comparableName(postal.province)
    })
    return { ...postal, villageRegionCode: matches.length === 1 ? matches[0].code : null }
  })
}

function parseSqlString(source, start) {
  if (source[start] !== "'") return null
  let value = ''
  for (let index = start + 1; index < source.length; index++) {
    if (source[index] !== "'") {
      value += source[index]
      continue
    }
    if (source[index + 1] === "'") {
      value += "'"
      index++
      continue
    }
    return { value, next: index + 1 }
  }
  return null
}

function regionFromCode(code, name) {
  const parts = code.split('.')
  if (parts.length === 1) return { code, name, level: 'province', kind: 'province', parentCode: '' }
  if (parts.length === 2) return {
    code,
    name,
    level: 'city',
    kind: name.toLocaleLowerCase('id-ID').startsWith('kota ') ? 'kota' : 'kabupaten',
    parentCode: parts[0],
  }
  if (parts.length === 3) return { code, name, level: 'district', kind: 'kecamatan', parentCode: parts.slice(0, 2).join('.') }
  if (parts.length === 4) return {
    code,
    name,
    level: 'village',
    kind: parts[3].startsWith('1') ? 'kelurahan' : 'desa',
    parentCode: parts.slice(0, 3).join('.'),
  }
  throw new Error(`unexpected region code ${code}`)
}

function verifyRegions(regions) {
  const expected = { province: 38, city: 514, district: 7285, village: 83762 }
  const counts = countByLevel(regions)
  for (const [level, count] of Object.entries(expected)) {
    if (counts[level] !== count) throw new Error(`${level} count = ${counts[level]}, expected ${count}`)
  }
  const codes = new Set()
  for (const region of regions) {
    if (codes.has(region.code)) throw new Error(`duplicate code ${region.code}`)
    codes.add(region.code)
  }
  for (const region of regions) {
    if (region.parentCode && !codes.has(region.parentCode)) throw new Error(`${region.code} has missing parent ${region.parentCode}`)
  }
}

function countByLevel(regions) {
  return regions.reduce((counts, region) => ({ ...counts, [region.level]: (counts[region.level] ?? 0) + 1 }), {})
}

function systematicAliases(region) {
  const name = normalizeName(region.name)
  const aliases = new Set()
  for (const prefix of ['kabupaten ', 'kota ', 'provinsi ', 'kab ', 'kec ', 'kel ', 'desa ']) {
    if (name.startsWith(prefix)) aliases.add(name.slice(prefix.length).trim())
  }
  if (name === 'daerah khusus ibukota jakarta' || name === 'dki jakarta') {
    aliases.add('jakarta')
    aliases.add('dki jakarta')
  }
  return [...aliases].filter((value) => value && value !== name).sort()
}

function normalizeName(value) {
  return value.trim().toLocaleLowerCase('id-ID').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function comparableName(value) {
  return normalizeName(value).replace(/^(provinsi|kabupaten|kota|kecamatan|kelurahan|desa)\s+/, '')
}

function batchedInsert(table, rows, verb = 'INSERT') {
  const batchSize = 200
  const statements = []
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const values = rows.slice(offset, offset + batchSize).map((row) => `(${row.map(sqlValue).join(', ')})`)
    statements.push(`${verb} INTO ${table} VALUES\n${values.join(',\n')};`)
  }
  return statements
}

function sqlValue(value) {
  if (value === null) return 'NULL'
  if (typeof value === 'number') return String(value)
  return `'${String(value).replaceAll("'", "''")}'`
}
