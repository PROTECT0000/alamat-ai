import { afterEach, describe, expect, it, vi } from 'vitest'
import { LLMError, OpenAICompatibleClient } from '../src/llm'
import type { RuntimeConfig } from '../src/types'

const extraction = {
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
}

describe('OpenAICompatibleClient', () => {
  afterEach(() => vi.restoreAllMocks())

  it('performs exactly one repair request for malformed model content', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(chatResponse('{broken'))
      .mockResolvedValueOnce(chatResponse(JSON.stringify(extraction)))
    const result = await new OpenAICompatibleClient(config).extract('Jalan Mawar 12')
    expect(result.attempts).toBe(2)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('classifies provider rate limits without reading the body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('sensitive provider body', {
      status: 429,
      headers: { 'Retry-After': '30' },
    }))
    const error = await new OpenAICompatibleClient(config).extract('Jalan Mawar 12').catch((value) => value)
    expect(error).toBeInstanceOf(LLMError)
    expect(error).toMatchObject({ kind: 'rate_limit', retryAfter: '30' })
  })
})

const config: RuntimeConfig = {
  appApiKey: 'test',
  llmApiKey: 'provider-key',
  llmBaseUrl: 'https://llm.example/v1',
  llmModel: 'test-model',
  llmTimeoutMs: 1000,
  llmMaxOutputTokens: 800,
  llmResponseFormat: 'prompt',
  fuzzyThreshold: 0.82,
  corsOrigins: new Set(),
  serviceVersion: 'test',
}

function chatResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
