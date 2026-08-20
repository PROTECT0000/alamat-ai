import type { RuntimeConfig, WorkerEnv } from './types'

export type ConfigField =
  | 'APP_API_KEY'
  | 'LLM_BASE_URL'
  | 'LLM_MODEL'
  | 'LLM_TIMEOUT_MS'
  | 'LLM_MAX_OUTPUT_TOKENS'
  | 'LLM_RESPONSE_FORMAT'
  | 'FUZZY_THRESHOLD'

export interface ConfigIssue {
  field: ConfigField
  reason: string
}

export class ConfigError extends Error {
  constructor(readonly issues: ConfigIssue[]) {
    super(issues.map(({ field, reason }) => `${field}: ${reason}`).join('; '))
    this.name = 'ConfigError'
  }
}

export function loadConfig(env: WorkerEnv): RuntimeConfig {
  const issues: ConfigIssue[] = []
  const appApiKey = env.APP_API_KEY?.trim() ?? ''
  const llmBaseUrl = (env.LLM_BASE_URL ?? '').trim().replace(/\/+$/, '')
  const llmModel = (env.LLM_MODEL ?? '').trim()
  const llmResponseFormat = (env.LLM_RESPONSE_FORMAT || 'prompt').trim()
  const llmTimeoutMs = positiveInteger(env.LLM_TIMEOUT_MS, 20_000, 'LLM_TIMEOUT_MS', issues)
  const llmMaxOutputTokens = positiveInteger(env.LLM_MAX_OUTPUT_TOKENS, 800, 'LLM_MAX_OUTPUT_TOKENS', issues)
  const fuzzyThreshold = finiteNumber(env.FUZZY_THRESHOLD, 0.82, 'FUZZY_THRESHOLD', issues)

  if (!appApiKey || appApiKey === 'replace-me') issues.push(configIssue('APP_API_KEY', 'wajib diisi dengan secret non-placeholder'))
  if (!llmBaseUrl) issues.push(configIssue('LLM_BASE_URL', 'wajib diisi'))
  if (!llmModel || llmModel === 'replace-me') issues.push(configIssue('LLM_MODEL', 'wajib diisi dengan model non-placeholder'))
  if (!['prompt', 'json_object', 'json_schema'].includes(llmResponseFormat)) {
    issues.push(configIssue('LLM_RESPONSE_FORMAT', 'harus berupa prompt, json_object, atau json_schema'))
  }
  if (fuzzyThreshold < 0.5 || fuzzyThreshold > 1) issues.push(configIssue('FUZZY_THRESHOLD', 'harus berada antara 0.5 dan 1'))
  if (issues.length > 0) throw new ConfigError(issues)

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

export function configIssues(env: WorkerEnv): ConfigIssue[] {
  try {
    loadConfig(env)
    return []
  } catch (error) {
    if (error instanceof ConfigError) return error.issues
    throw error
  }
}

function positiveInteger(value: string | undefined, fallback: number, name: ConfigField, issues: ConfigIssue[]): number {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    issues.push(configIssue(name, 'harus berupa integer positif'))
    return fallback
  }
  return parsed
}

function finiteNumber(value: string | undefined, fallback: number, name: ConfigField, issues: ConfigIssue[]): number {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    issues.push(configIssue(name, 'harus berupa angka'))
    return fallback
  }
  return parsed
}

function configIssue(field: ConfigField, reason: string): ConfigIssue {
  return { field, reason }
}
