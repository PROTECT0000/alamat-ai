import { describe, expect, it } from 'vitest'
import type { Gazetteer } from '../src/gazetteer'
import { normalizeName } from '../src/gazetteer'
import type { ExtractedAddress, Level, LookupMatch, PostalQuery, PostalRecord, Region, SourceMetadata } from '../src/types'
import { Validator, similarity } from '../src/validation'

const regions: Region[] = [
  region('32', 'province', 'Jawa Barat'),
  region('32.76', 'city', 'Kota Depok', '32'),
  region('32.76.01', 'district', 'Cilodong', '32.76'),
  region('32.76.01.1001', 'village', 'Sukamaju', '32.76.01'),
  region('32.16', 'city', 'Kabupaten Bekasi', '32'),
  region('32.75', 'city', 'Kota Bekasi', '32'),
  region('31', 'province', 'DKI Jakarta'),
]

class FakeGazetteer implements Gazetteer {
  postalRecords: PostalRecord[] = []

  async ping() {}
  async lookup(level: Level, normalized: string): Promise<LookupMatch[]> {
    const matches: LookupMatch[] = []
    for (const item of regions) {
      if (item.level !== level) continue
      const name = normalizeName(item.name)
      if (name === normalized) matches.push({ region: item, alias: false })
      else if (name.replace(/^(kabupaten|kota|provinsi) /, '') === normalized) matches.push({ region: item, alias: true })
    }
    return matches
  }
  async children(parentCode: string, level: Level) { return regions.filter((item) => item.parentCode === parentCode && item.level === level) }
  async listLevel(level: Level) { return regions.filter((item) => item.level === level) }
  async ancestors(code: string) {
    const result: Region[] = []
    let current = regions.find((item) => item.code === code)
    while (current?.parentCode) {
      current = regions.find((item) => item.code === current!.parentCode)
      if (current) result.push(current)
    }
    return result
  }
  async lookupPostal(query: PostalQuery) {
    const records = this.postalRecords.filter((record) =>
      (!query.code || record.code === query.code)
      && (!query.village || normalizeName(record.village) === normalizeName(query.village))
      && (!query.district || normalizeName(record.district) === normalizeName(query.district))
      && (!query.regency || normalizeName(record.regency).endsWith(normalizeName(query.regency).replace(/^(kabupaten|kota) /, '')))
      && (!query.province || normalizeName(record.province) === normalizeName(query.province)),
    )
    return { records, truncated: false }
  }
  async postalCodes(regionCode: string) { return [...new Set(this.postalRecords.filter((record) => record.villageRegionCode === regionCode).map((record) => record.code))] }
  async version() { return 'fixture' }
  async sources(): Promise<SourceMetadata[]> { return [] }
}

describe('Validator', () => {
  const repository = new FakeGazetteer()
  const validator = new Validator(repository, 0.82)

  it('fuzzy matches a misspelled province', async () => {
    const result = await validator.validate(address({ provinsi: 'Jawa Bart' }))
    expect(result.admin.provinsi).toMatchObject({ code: '32', match: 'fuzzy' })
    expect(result.status).toBe('needs_clarification')
  })

  it('infers every ancestor from a resolved village', async () => {
    const result = await validator.validate(address({ desa_kelurahan: 'Sukamaju' }))
    expect(result.admin.kecamatan).toMatchObject({ code: '32.76.01', match: 'inferred' })
    expect(result.admin.kabupaten_kota).toMatchObject({ code: '32.76', match: 'inferred' })
    expect(result.admin.provinsi).toMatchObject({ code: '32', match: 'inferred' })
  })

  it('marks an AI-estimated administrative field as inferred', async () => {
    const result = await validator.validate(address({
      desa_kelurahan: 'Sukamaju',
      inferred_fields: ['desa_kelurahan'],
    }))

    expect(result.admin.desa_kelurahan).toMatchObject({ code: '32.76.01.1001', match: 'inferred', score: 0.5 })
  })

  it('infers a shared province from ambiguous city candidates', async () => {
    const result = await validator.validate(address({ kabupaten_kota: 'Bekasi' }))

    expect(result.admin.kabupaten_kota.code).toBeNull()
    expect(result.admin.provinsi).toMatchObject({ code: '32', name: 'Jawa Barat', match: 'inferred' })
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'AMBIGUOUS_REGION', field: 'kabupaten_kota' })]))
    expect(result.issues).not.toEqual(expect.arrayContaining([expect.objectContaining({ code: 'MISSING_FIELD', field: 'provinsi' })]))
  })

  it('detects hierarchy conflicts without guessing', async () => {
    const result = await validator.validate(address({ desa_kelurahan: 'Sukamaju', provinsi: 'DKI Jakarta' }))
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'HIERARCHY_MISMATCH' })]))
    expect(result.status).toBe('needs_clarification')
  })

  it('rejects text with no address signal', async () => {
    const result = await validator.validate(address({ is_address: false, jalan: null, nomor: null }))
    expect(result.status).toBe('invalid')
    expect(result.issues[0].code).toBe('NON_ADDRESS_INPUT')
  })

  it('uses transposition-aware similarity', () => {
    expect(similarity('depko', 'depok')).toBeGreaterThanOrEqual(0.8)
  })

  it('enriches a unique locality with its postal code', async () => {
    repository.postalRecords = [postalRecord()]
    const result = await validator.validate(address({
      desa_kelurahan: 'Sukamaju',
      kecamatan: 'Cilodong',
      kabupaten_kota: 'Kota Depok',
      provinsi: 'Jawa Barat',
    }))

    expect(result.address.kode_pos).toBe('16415')
    expect(result.admin.desa_kelurahan.code).toBe('32.76.01.1001')
    repository.postalRecords = []
  })

  it('infers a unique postal code from the resolved gazetteer village mapping', async () => {
    repository.postalRecords = [{ ...postalRecord(), village: 'Different upstream spelling' }]
    const result = await validator.validate(address({ desa_kelurahan: 'Sukamaju' }))

    expect(result.address.kode_pos).toBe('16415')
    repository.postalRecords = []
  })

  it('does not select a village when one postal code has multiple rows', async () => {
    repository.postalRecords = [postalRecord(), { ...postalRecord(), village: 'Arenjaya', villageRegionCode: null }]
    const result = await validator.validate(address({ kode_pos: '16415' }))

    expect(result.address.kode_pos).toBe('16415')
    expect(result.address.desa_kelurahan).toBeNull()
    repository.postalRecords = []
  })
})

function address(overrides: Partial<ExtractedAddress>): ExtractedAddress {
  return {
    is_address: true,
    inferred_fields: [],
    jalan: 'Jalan Mawar',
    nomor: '12',
    rt: null,
    rw: null,
    blok: null,
    unit: null,
    desa_kelurahan: null,
    kecamatan: null,
    kabupaten_kota: null,
    provinsi: null,
    kode_pos: null,
    patokan: null,
    penerima: null,
    kontak: null,
    catatan: null,
    ...overrides,
  }
}

function region(code: string, level: Level, name: string, parentCode = ''): Region {
  return { code, level, name, parentCode, parentName: '', kind: level }
}

function postalRecord(): PostalRecord {
  return {
    code: '16415',
    village: 'Sukamaju',
    district: 'Cilodong',
    regency: 'Depok',
    province: 'Jawa Barat',
    latitude: -6.42,
    longitude: 106.84,
    elevation: 75,
    timezone: 'WIB',
    villageRegionCode: '32.76.01.1001',
  }
}
