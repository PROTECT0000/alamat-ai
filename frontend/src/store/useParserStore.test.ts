import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as apiService from '../services/api'
import type { ParseResponse } from '../types/api'
import { useParserStore } from './useParserStore'

const response: ParseResponse = {
  request_id: 'test-request',
  address: {
    jalan: 'Jl. Mawar', nomor: '12', rt: null, rw: null, blok: null, unit: null,
    desa_kelurahan: 'Sukamaju', kecamatan: 'Cilodong', kabupaten_kota: 'Kota Depok',
    provinsi: 'Jawa Barat', kode_pos: null, patokan: null, penerima: null, kontak: null, catatan: null,
  },
  validation: {
    status: 'valid',
    admin: {
      desa_kelurahan: { input: 'Sukamaju', code: '32.76.08.1001', name: 'Sukamaju', match: 'exact', score: 1 },
      kecamatan: { input: 'Cilodong', code: '32.76.08', name: 'Cilodong', match: 'exact', score: 1 },
      kabupaten_kota: { input: 'Kota Depok', code: '32.76', name: 'Kota Depok', match: 'exact', score: 1 },
      provinsi: { input: 'Jawa Barat', code: '32', name: 'Jawa Barat', match: 'exact', score: 1 },
    },
  },
  issues: [],
  clarification_message: null,
  meta: { model: 'test', llm_attempts: 1, latency_ms: 42, gazetteer_version: 'test-sha' },
}

describe('useParserStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useParserStore.setState({ text: 'Jl. Mawar 12', apiKey: '', result: null, status: 'idle', error: null })
    vi.restoreAllMocks()
  })

  it('fails locally before calling the API when the session key is missing', async () => {
    const request = vi.spyOn(apiService, 'parseAddress')
    await useParserStore.getState().parse()
    expect(request).not.toHaveBeenCalled()
    expect(useParserStore.getState().status).toBe('error')
    expect(useParserStore.getState().error?.code).toBe('MISSING_API_KEY')
  })

  it('stores a successful parse response', async () => {
    vi.spyOn(apiService, 'parseAddress').mockResolvedValue(response)
    useParserStore.setState({ apiKey: 'session-key' })
    await useParserStore.getState().parse()
    expect(apiService.parseAddress).toHaveBeenCalledWith('Jl. Mawar 12', 'session-key')
    expect(useParserStore.getState().status).toBe('success')
    expect(useParserStore.getState().result?.validation.status).toBe('valid')
  })
})
