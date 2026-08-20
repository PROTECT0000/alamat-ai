export const addressFieldNames = [
  'jalan', 'nomor', 'rt', 'rw', 'blok', 'unit', 'desa_kelurahan', 'kecamatan',
  'kabupaten_kota', 'provinsi', 'kode_pos', 'patokan', 'penerima', 'kontak', 'catatan',
] as const

export type AddressField = (typeof addressFieldNames)[number]

export type Address = Record<AddressField, string | null>

export interface ExtractedAddress extends Address {
  is_address: boolean
}

export type Level = 'province' | 'city' | 'district' | 'village'
export type MatchType = 'exact' | 'alias' | 'fuzzy' | 'inferred' | 'none'
export type ValidationStatus = 'valid' | 'needs_clarification' | 'invalid'
export type IssueCode =
  | 'MISSING_FIELD'
  | 'UNKNOWN_REGION'
  | 'AMBIGUOUS_REGION'
  | 'HIERARCHY_MISMATCH'
  | 'POSTAL_CODE_MISMATCH'
  | 'POSTAL_CODE_UNKNOWN'
  | 'NON_ADDRESS_INPUT'

export interface Region {
  code: string
  level: Level
  kind: string
  parentCode: string
  parentName: string
  name: string
}

export interface LookupMatch {
  region: Region
  alias: boolean
}

export interface Candidate {
  code: string
  name: string
  parent: string | null
}

export interface Issue {
  code: IssueCode
  field: string | null
  severity: 'info' | 'warning' | 'error'
  message: string
  candidates: Candidate[]
}

export interface AdminMatch {
  input: string | null
  code: string | null
  name: string | null
  match: MatchType
  score: number
}

export type AdminValidation = Record<'desa_kelurahan' | 'kecamatan' | 'kabupaten_kota' | 'provinsi', AdminMatch>

export interface ValidationResult {
  status: ValidationStatus
  admin: AdminValidation
  issues: Issue[]
}

export interface ParseResponse {
  request_id: string
  address: Address
  validation: Omit<ValidationResult, 'issues'>
  issues: Issue[]
  clarification_message: string | null
  meta: {
    model: string
    llm_attempts: number
    latency_ms: number
    gazetteer_version: string
  }
}

export interface SourceMetadata {
  source_name: string
  source_role: 'official_benchmark' | 'machine_readable_primary' | 'cross_check' | 'enrichment'
  commit_hash: string
  license: string
  record_count: number
}

export interface WorkerEnv {
  DB: D1Database
  APP_API_KEY: string
  LLM_API_KEY?: string
  LLM_BASE_URL: string
  LLM_MODEL: string
  LLM_TIMEOUT_MS: string
  LLM_MAX_OUTPUT_TOKENS: string
  LLM_RESPONSE_FORMAT: string
  FUZZY_THRESHOLD: string
  CORS_ORIGINS: string
  SERVICE_VERSION: string
}

export interface RuntimeConfig {
  appApiKey: string
  llmApiKey: string
  llmBaseUrl: string
  llmModel: string
  llmTimeoutMs: number
  llmMaxOutputTokens: number
  llmResponseFormat: 'prompt' | 'json_object' | 'json_schema'
  fuzzyThreshold: number
  corsOrigins: Set<string>
  serviceVersion: string
}
