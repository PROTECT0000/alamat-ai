import { addressFieldNames, inferenceFieldNames, type Address, type ExtractedAddress, type InferenceField } from './types'

const limits: Record<keyof Address, number> = {
  jalan: 256,
  nomor: 64,
  rt: 16,
  rw: 16,
  blok: 64,
  unit: 128,
  desa_kelurahan: 256,
  kecamatan: 256,
  kabupaten_kota: 256,
  provinsi: 256,
  kode_pos: 16,
  patokan: 500,
  penerima: 256,
  kontak: 64,
  catatan: 500,
}

export function decodeExtraction(content: string): ExtractedAddress {
  const cleaned = stripCodeFence(content.trim())
  let value: unknown
  try {
    value = JSON.parse(cleaned)
  } catch (error) {
    throw new Error('model output is not valid JSON', { cause: error })
  }
  if (!isPlainObject(value)) throw new Error('model output must be a JSON object')

  const expected = new Set(['is_address', 'inferred_fields', ...addressFieldNames])
  const keys = Object.keys(value)
  if (keys.length !== expected.size || keys.some((key) => !expected.has(key))) {
    throw new Error('model output contains missing or unknown fields')
  }
  if (typeof value.is_address !== 'boolean') throw new Error('is_address must be a boolean')
  if (!Array.isArray(value.inferred_fields)
    || value.inferred_fields.length > inferenceFieldNames.length
    || value.inferred_fields.some((field) => typeof field !== 'string' || !inferenceFieldNames.includes(field as InferenceField))
    || new Set(value.inferred_fields).size !== value.inferred_fields.length) {
    throw new Error('inferred_fields must contain unique inferable field names')
  }

  const result = { is_address: value.is_address, inferred_fields: value.inferred_fields as InferenceField[] } as ExtractedAddress
  for (const field of addressFieldNames) {
    const raw = value[field]
    if (raw !== null && typeof raw !== 'string') throw new Error(`${field} must be a string or null`)
    const normalized = typeof raw === 'string' ? raw.trim() || null : null
    if (normalized !== null && Array.from(normalized).length > limits[field]) {
      throw new Error(`${field} exceeds ${limits[field]} characters`)
    }
    result[field] = normalized
  }
  return result
}

export function publicAddress(value: ExtractedAddress): Address {
  return Object.fromEntries(addressFieldNames.map((field) => [field, value[field]])) as unknown as Address
}

export function signalCount(value: Address): number {
  return ['jalan', 'nomor', 'rt', 'rw', 'desa_kelurahan', 'kecamatan', 'kabupaten_kota', 'provinsi', 'kode_pos', 'patokan']
    .filter((field) => value[field as keyof Address] !== null).length
}

function stripCodeFence(value: string): string {
  if (!value.startsWith('```')) return value
  return value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
