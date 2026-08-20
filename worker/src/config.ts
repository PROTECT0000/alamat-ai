import type { RuntimeConfig, WorkerEnv } from './types'

export class ConfigError extends Error {}

export function loadConfig(env: WorkerEnv): RuntimeConfig {
  const errors: string[] = []
  const appApiKey = env.APP_API_KEY?.trim() ?? ''
  const llmBaseUrl = (env.LLM_BASE_URL ?? '').trim().replace(/\/+$/, '')
  const llmModel = (env.LLM_MODEL ?? '').trim()
  const llmResponseFormat = (env.LLM_RESPONSE_FORMAT || 'prompt').trim()
  const llmTimeoutMs = positiveInteger(env.LLM_TIMEOUT_MS, 20_000, 'LLM_TIMEOUT_MS', errors)
  const llmMaxOutputTokens = positiveInteger(env.LLM_MAX_OUTPUT_TOKENS, 800, 'LLM_MAX_OUTPUT_TOKENS', errors)
  const fuzzyThreshold = finiteNumber(env.FUZZY_THRESHOLD, 0.82, 'FUZZY_THRESHOLD', errors)

  if (!appApiKey || appApiKey === 'replace-me') errors.push('APP_API_KEY must be a non-placeholder secret')
  if (!llmBaseUrl) errors.push('LLM_BASE_URL is required')
  if (!llmModel || llmModel === 'replace-me') errors.push('LLM_MODEL must be configured')
  if (!['prompt', 'json_object', 'json_schema'].includes(llmResponseFormat)) {
    errors.push('LLM_RESPONSE_FORMAT must be prompt, json_object, or json_schema')
  }
  if (fuzzyThreshold < 0.5 || fuzzyThreshold > 1) errors.push('FUZZY_THRESHOLD must be between 0.5 and 1')
  if (errors.length > 0) throw new ConfigError(errors.join('; '))

  return {
    appApiKey,
    llmApiKey: env.LLM_API_KEY?.trim() ?? '',
    llmBaseUrl,
    llmModel,
    llmTimeoutMs,
    llmMaxOutputTokens,
    llmResponseFormat: llmResponseFormat as RuntimeConfig['llmResponseFormat'],
    fuzzyThreshold,
    corsOrigins: new Set((env.CORS_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean)),
    serviceVersion: env.SERVICE_VERSION?.trim() || 'dev',
  }
}

export function configIsPresent(env: WorkerEnv): boolean {
  try {
    loadConfig(env)
    return true
  } catch {
    return false
  }
}

function positiveInteger(value: string | undefined, fallback: number, name: string, errors: string[]): number {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    errors.push(`${name} must be a positive integer`)
    return fallback
  }
  return parsed
}

function finiteNumber(value: string | undefined, fallback: number, name: string, errors: string[]): number {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    errors.push(`${name} must be a number`)
    return fallback
  }
  return parsed
}
