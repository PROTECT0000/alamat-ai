import { env } from 'cloudflare:workers'
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleRequest } from '../src/app'
import worker from '../src/index'
import type { WorkerEnv } from '../src/types'

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>

const extraction = {
  is_address: true,
  jalan: 'Jalan Mawar',
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

describe('AlamatAI Worker', () => {
  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM postal_codes'),
      env.DB.prepare('DELETE FROM region_aliases'),
      env.DB.prepare('DELETE FROM regions'),
      env.DB.prepare('DELETE FROM source_metadata'),
      env.DB.prepare("INSERT INTO regions VALUES ('32', 'province', 'province', NULL, 'Jawa Barat', 'jawa barat')"),
      env.DB.prepare("INSERT INTO regions VALUES ('32.76', 'city', 'kota', '32', 'Kota Depok', 'kota depok')"),
      env.DB.prepare("INSERT INTO regions VALUES ('32.76.01', 'district', 'kecamatan', '32.76', 'Cilodong', 'cilodong')"),
      env.DB.prepare("INSERT INTO regions VALUES ('32.76.01.1001', 'village', 'kelurahan', '32.76.01', 'Sukamaju', 'sukamaju')"),
      env.DB.prepare("INSERT INTO postal_codes(code, village, normalized_village, district, normalized_district, regency, normalized_regency, province, normalized_province, latitude, longitude, elevation, timezone, village_region_code) VALUES ('16415', 'Sukamaju', 'sukamaju', 'Cilodong', 'cilodong', 'Depok', 'depok', 'Jawa Barat', 'jawa barat', -6.42, 106.84, 75, 'WIB', '32.76.01.1001')"),
      env.DB.prepare("INSERT INTO source_metadata VALUES (1, 'cahyadsn/wilayah', 'https://github.com/cahyadsn/wilayah', 'fixture-commit', NULL, 'MIT', 'fixture', 'machine_readable_primary', 4, '2026-08-20T00:00:00Z', 'test fixture')"),
    ])
  })

  afterEach(() => vi.restoreAllMocks())

  it('serves public health and readiness endpoints', async () => {
    expect((await dispatch('/healthz')).status).toBe(200)
    const ready = await dispatch('/readyz')
    expect(ready.status).toBe(200)
    expect(await ready.json()).toMatchObject({
      status: 'ready',
      gazetteer_ready: true,
      llm_configured: true,
      config_issues: [],
    })
  })

  it('reports invalid configuration fields without exposing their values', async () => {
    const brokenEnv = { ...env, APP_API_KEY: 'test-app-key', LLM_MODEL: 'replace-me' } as WorkerEnv
    const readiness = await handleRequest(new Request('https://alamatai.test/readyz'), brokenEnv)
    expect(await readiness.json()).toMatchObject({
      status: 'not_ready',
      llm_configured: false,
      config_issues: [{ field: 'LLM_MODEL', reason: expect.any(String) }],
    })

    const response = await handleRequest(new Request('https://alamatai.test/v1/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-app-key' },
      body: JSON.stringify({ text: 'Jalan Mawar 12 Depok' }),
    }), brokenEnv)
    const result = await response.json<Record<string, any>>()

    expect(response.status).toBe(503)
    expect(result.error.message).toContain('LLM_MODEL')
    expect(result.error.config_issues).toEqual([
      { field: 'LLM_MODEL', reason: 'wajib diisi dengan model non-placeholder' },
    ])
    expect(JSON.stringify(result)).not.toContain('replace-me')
  })

  it('rejects unsupported reasoning effort values', async () => {
    const brokenEnv = { ...env, LLM_REASONING_EFFORT: 'maximum' } as WorkerEnv
    const readiness = await handleRequest(new Request('https://alamatai.test/readyz'), brokenEnv)

    expect(readiness.status).toBe(503)
    expect(await readiness.json()).toMatchObject({
      status: 'not_ready',
      config_issues: [{ field: 'LLM_REASONING_EFFORT', reason: expect.any(String) }],
    })
  })

  it('requires the application API key', async () => {
    const response = await dispatch('/v1/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Jalan Mawar 12 Depok' }),
    })
    expect(response.status).toBe(401)
  })

  it('extracts through an OpenAI-compatible endpoint and validates with D1', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(extraction) } }],
    }), { headers: { 'Content-Type': 'application/json' } }))

    const response = await dispatch('/v1/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-app-key' },
      body: JSON.stringify({ text: 'Jalan Mawar 12, Sukamaju, Cilodong, Kota Depok, Jawa Barat' }),
    })
    const result = await response.json<Record<string, any>>()

    expect(response.status).toBe(200)
    expect(result.validation.status).toBe('valid')
    expect(result.address.kode_pos).toBe('16415')
    expect(result.validation.admin.desa_kelurahan.code).toBe('32.76.01.1001')
    expect(result.meta).toMatchObject({ model: 'test-model', llm_attempts: 1, gazetteer_version: 'fixture-commit' })
    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(response.headers.get('X-Request-ID')).toMatch(/^[a-f0-9]{32}$/)
  })
})

async function dispatch(path: string, init?: RequestInit<IncomingRequestCfProperties>): Promise<Response> {
  const context = createExecutionContext()
  const response = await worker.fetch(new IncomingRequest(`https://alamatai.test${path}`, init), env as WorkerEnv, context)
  await waitOnExecutionContext(context)
  return response
}
