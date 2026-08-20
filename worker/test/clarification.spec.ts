import { describe, expect, it } from 'vitest'
import { generateClarification } from '../src/clarification'

describe('generateClarification', () => {
  it('returns no message for a valid result', () => {
    expect(generateClarification({ status: 'valid', admin: emptyAdmin(), issues: [] })).toBeNull()
  })

  it('returns at most two deterministic questions', () => {
    const message = generateClarification({
      status: 'needs_clarification',
      admin: emptyAdmin(),
      issues: [
        { code: 'MISSING_FIELD', field: 'jalan', severity: 'warning', message: '', candidates: [] },
        { code: 'MISSING_FIELD', field: 'nomor', severity: 'warning', message: '', candidates: [] },
        { code: 'MISSING_FIELD', field: 'kecamatan', severity: 'warning', message: '', candidates: [] },
      ],
    })
    expect(message).toContain('jalan-nya?')
    expect(message).toContain('nomor-nya?')
    expect(message).not.toContain('kecamatan-nya?')
  })
})

function emptyAdmin() {
  const value = { input: null, code: null, name: null, match: 'none' as const, score: 0 }
  return { desa_kelurahan: value, kecamatan: value, kabupaten_kota: value, provinsi: value }
}
