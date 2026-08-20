import { describe, expect, it } from 'vitest'
import type { Gazetteer } from '../src/gazetteer'
import { normalizeName } from '../src/gazetteer'
import type { ExtractedAddress, Level, LookupMatch, Region, SourceMetadata } from '../src/types'
import { Validator, similarity } from '../src/validation'

const regions: Region[] = [
  region('32', 'province', 'Jawa Barat'),
  region('32.76', 'city', 'Kota Depok', '32'),
  region('32.76.01', 'district', 'Cilodong', '32.76'),
  region('32.76.01.1001', 'village', 'Sukamaju', '32.76.01'),
  region('31', 'province', 'DKI Jakarta'),
]

class FakeGazetteer implements Gazetteer {
  async ping() {}
  async lookup(level: Level, normalized: string): Promise<LookupMatch[]> {
    return regions.filter((item) => item.level === level && normalizeName(item.name) === normalized).map((item) => ({ region: item, alias: false }))
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
  async postalCodes() { return [] }
  async version() { return 'fixture' }
  async sources(): Promise<SourceMetadata[]> { return [] }
}

describe('Validator', () => {
  const validator = new Validator(new FakeGazetteer(), 0.82)

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
})

function address(overrides: Partial<ExtractedAddress>): ExtractedAddress {
  return {
    is_address: true,
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
