import { describe, expect, it } from 'vitest'
import { decodeExtraction } from '../src/address'

const complete = {
  is_address: true,
  inferred_fields: ['provinsi'],
  jalan: ' Jl. Mawar ',
  nomor: '12',
  rt: null,
  rw: null,
  blok: null,
  unit: null,
  desa_kelurahan: 'Sukamaju',
  kecamatan: 'Cilodong',
  kabupaten_kota: 'Kota Depok',
  provinsi: 'Jawa Barat',
  kode_pos: null,
  patokan: null,
  penerima: null,
  kontak: null,
  catatan: null,
}

describe('decodeExtraction', () => {
  it('accepts exactly the extraction schema and trims values', () => {
    const result = decodeExtraction(`\`\`\`json\n${JSON.stringify(complete)}\n\`\`\``)
    expect(result.jalan).toBe('Jl. Mawar')
    expect(result.is_address).toBe(true)
    expect(result.inferred_fields).toEqual(['provinsi'])
  })

  it('rejects missing and unknown fields', () => {
    const { nomor: _, ...missing } = complete
    expect(() => decodeExtraction(JSON.stringify(missing))).toThrow(/missing or unknown/)
    expect(() => decodeExtraction(JSON.stringify({ ...complete, confidence: 0.9 }))).toThrow(/missing or unknown/)
  })

  it('rejects invalid or duplicate inferred fields', () => {
    expect(() => decodeExtraction(JSON.stringify({ ...complete, inferred_fields: ['jalan'] }))).toThrow(/inferred_fields/)
    expect(() => decodeExtraction(JSON.stringify({ ...complete, inferred_fields: ['provinsi', 'provinsi'] }))).toThrow(/inferred_fields/)
  })
})
