import { publicAddress } from './address'
import { generateClarification } from './clarification'
import { ConfigError, configIssues, loadConfig, type ConfigIssue } from './config'
import { D1Gazetteer } from './gazetteer'
import { LLMError, OpenAICompatibleClient } from './llm'
import type { ParseResponse, WorkerEnv } from './types'
import { Validator } from './validation'

const maxRequestBody = 16 * 1024

type APIErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'VALIDATION_ERROR'
  | 'LLM_UPSTREAM_ERROR'
  | 'LLM_UPSTREAM_RATE_LIMITED'
  | 'LLM_TIMEOUT'
  | 'LLM_INVALID_RESPONSE'
  | 'SERVICE_NOT_READY'
  | 'INTERNAL_ERROR'

export async function handleRequest(request: Request, env: WorkerEnv): Promise<Response> {
  const started = Date.now()
  const requestId = crypto.randomUUID().replaceAll('-', '')
  const url = new URL(request.url)
  let response: Response

  try {
    if (request.method === 'OPTIONS') {
      response = preflight(request, env)
    } else if (url.pathname === '/healthz' && request.method === 'GET') {
      response = json({ status: 'ok', version: env.SERVICE_VERSION || 'dev' })
    } else if (url.pathname === '/readyz' && request.method === 'GET') {
      response = await readiness(env)
    } else if (url.pathname === '/v1/parse' && request.method === 'POST') {
      response = await parse(request, env, requestId)
    } else {
      response = errorResponse(404, 'INVALID_REQUEST', 'Endpoint tidak ditemukan.', requestId)
    }
  } catch (error) {
    console.error(JSON.stringify({ event: 'unhandled_error', request_id: requestId, error_type: errorName(error) }))
    response = errorResponse(500, 'INTERNAL_ERROR', 'Terjadi kesalahan internal.', requestId)
  }

  response.headers.set('X-Request-ID', requestId)
  applyCors(response.headers, request.headers.get('Origin'), env.CORS_ORIGINS)
  console.log(JSON.stringify({
    event: 'http_request',
    request_id: requestId,
    method: request.method,
    path: url.pathname,
    status: response.status,
    latency_ms: Date.now() - started,
  }))
  return response
}

async function readiness(env: WorkerEnv): Promise<Response> {
  const repository = new D1Gazetteer(env.DB)
  let gazetteerReady = true
  let gazetteerVersion = ''
  let sources: Awaited<ReturnType<D1Gazetteer['sources']>> = []
  try {
    await repository.ping()
    ;[gazetteerVersion, sources] = await Promise.all([repository.version(), repository.sources()])
  } catch {
    gazetteerReady = false
  }
  const workerConfigIssues = configIssues(env)
  const llmConfigured = workerConfigIssues.length === 0
  const ready = gazetteerReady && llmConfigured
  return json({
    status: ready ? 'ready' : 'not_ready',
    version: env.SERVICE_VERSION || 'dev',
    llm_configured: llmConfigured,
    config_issues: workerConfigIssues,
    gazetteer_ready: gazetteerReady,
    model: env.LLM_MODEL || '',
    gazetteer_version: gazetteerVersion,
    sources,
  }, ready ? 200 : 503)
}

async function parse(request: Request, env: WorkerEnv, requestId: string): Promise<Response> {
  if (!await secureEqual(request.headers.get('X-API-Key') ?? '', env.APP_API_KEY ?? '')) {
    return errorResponse(401, 'UNAUTHORIZED', 'API key tidak valid.', requestId)
  }
  const mediaType = (request.headers.get('Content-Type') ?? '').split(';', 1)[0].trim().toLowerCase()
  if (mediaType !== 'application/json') {
    return errorResponse(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type harus application/json.', requestId)
  }
  const declaredLength = Number(request.headers.get('Content-Length') ?? '0')
  if (Number.isFinite(declaredLength) && declaredLength > maxRequestBody) {
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'Request body melebihi 16 KiB.', requestId)
  }

  const rawBody = await readLimitedBody(request, maxRequestBody)
  if (rawBody === null) {
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'Request body melebihi 16 KiB.', requestId)
  }
  let body: unknown
  try {
    body = JSON.parse(new TextDecoder().decode(rawBody))
  } catch {
    return errorResponse(400, 'INVALID_REQUEST', 'Request JSON tidak valid.', requestId)
  }
  if (!isParseBody(body)) return errorResponse(400, 'INVALID_REQUEST', 'Request JSON tidak valid.', requestId)
  const text = body.text.trim()
  if (!text || Array.from(text).length > 2000) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Text wajib berisi 1 sampai 2.000 karakter.', requestId)
  }

  let config
  try {
    config = loadConfig(env)
  } catch (error) {
    if (error instanceof ConfigError) {
      const fields = error.issues.map(({ field }) => field).join(', ')
      return errorResponse(
        503,
        'SERVICE_NOT_READY',
        `Konfigurasi Worker belum lengkap atau invalid: ${fields}.`,
        requestId,
        error.issues,
      )
    }
    throw error
  }

  try {
    const pipelineStarted = Date.now()
    const repository = new D1Gazetteer(env.DB)
    const gazetteerVersion = await repository.version()
    const extracted = await new OpenAICompatibleClient(config).extract(text)
    const validation = await new Validator(repository, config.fuzzyThreshold).validate(extracted.address)
    const result: ParseResponse = {
      request_id: requestId,
      address: publicAddress(extracted.address),
      validation: { status: validation.status, admin: validation.admin },
      issues: validation.issues,
      clarification_message: generateClarification(validation),
      meta: {
        model: extracted.model,
        llm_attempts: extracted.attempts,
        latency_ms: Date.now() - pipelineStarted,
        gazetteer_version: gazetteerVersion,
      },
    }
    return json(result)
  } catch (error) {
    if (error instanceof LLMError) {
      console.warn(JSON.stringify({ event: 'llm_request_failed', request_id: requestId, kind: error.kind, status: error.statusCode }))
      if (error.kind === 'timeout') return errorResponse(504, 'LLM_TIMEOUT', 'Model tidak merespons dalam batas waktu.', requestId)
      if (error.kind === 'rate_limit') {
        const response = errorResponse(503, 'LLM_UPSTREAM_RATE_LIMITED', 'Provider sedang membatasi request. Coba lagi nanti.', requestId)
        const retryAfter = safeRetryAfter(error.retryAfter)
        if (retryAfter) response.headers.set('Retry-After', retryAfter)
        return response
      }
      if (error.kind === 'invalid_response') return errorResponse(502, 'LLM_INVALID_RESPONSE', 'Model tidak menghasilkan data terstruktur yang valid.', requestId)
      return errorResponse(502, 'LLM_UPSTREAM_ERROR', 'Provider model sedang tidak tersedia.', requestId)
    }
    console.error(JSON.stringify({ event: 'pipeline_failed', request_id: requestId, error_type: errorName(error) }))
    return errorResponse(503, 'SERVICE_NOT_READY', 'Layanan validasi alamat belum siap.', requestId)
  }
}

function preflight(request: Request, env: WorkerEnv): Response {
  const origin = request.headers.get('Origin')
  if (!origin || !isAllowedOrigin(origin, env.CORS_ORIGINS)) {
    return new Response(null, { status: 403 })
  }
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  })
}

function applyCors(headers: Headers, origin: string | null, configured: string): void {
  if (!origin || !isAllowedOrigin(origin, configured)) return
  headers.set('Access-Control-Allow-Origin', configured.split(',').map((item) => item.trim()).includes('*') ? '*' : origin)
  headers.append('Vary', 'Origin')
}

function isAllowedOrigin(origin: string, configured: string): boolean {
  const origins = configured.split(',').map((value) => value.trim()).filter(Boolean)
  return origins.includes('*') || origins.includes(origin)
}

async function secureEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ])
  const a = new Uint8Array(leftHash)
  const b = new Uint8Array(rightHash)
  let difference = 0
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index]
  return difference === 0 && left.length > 0 && right.length > 0
}

function isParseBody(value: unknown): value is { text: string } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.keys(value).length === 1 && typeof (value as { text?: unknown }).text === 'string'
}

async function readLimitedBody(request: Request, limit: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

function safeRetryAfter(value: string): string {
  const seconds = Number(value.trim())
  return Number.isInteger(seconds) && seconds >= 0 && seconds <= 3600 ? String(seconds) : ''
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function errorResponse(
  status: number,
  code: APIErrorCode,
  message: string,
  requestId: string,
  workerConfigIssues?: ConfigIssue[],
): Response {
  const error = { code, message, request_id: requestId, ...(workerConfigIssues ? { config_issues: workerConfigIssues } : {}) }
  return json({ error }, status)
}

function errorName(value: unknown): string {
  return value instanceof Error ? value.name : 'UnknownError'
}
