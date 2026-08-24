import axios, { AxiosError } from 'axios'
import type { APIErrorResponse, InferenceMode, ParseRequest, ParseResponse, ReadinessResponse } from '../types/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 35_000,
  headers: { Accept: 'application/json' },
})

export class ApiClientError extends Error {
  readonly code?: string
  readonly requestId?: string
  readonly status?: number

  constructor(message: string, options?: { code?: string; requestId?: string; status?: number }) {
    super(message)
    this.name = 'ApiClientError'
    this.code = options?.code
    this.requestId = options?.requestId
    this.status = options?.status
  }
}

export async function parseAddress(text: string, apiKey: string, mode: InferenceMode): Promise<ParseResponse> {
  try {
    const payload: ParseRequest = { text, mode }
    const response = await api.post<ParseResponse>('/v1/parse', payload, {
      headers: { 'X-API-Key': apiKey },
    })
    return response.data
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function getReadiness(): Promise<ReadinessResponse> {
  try {
    const response = await api.get<ReadinessResponse>('/readyz')
    return response.data
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export function normalizeApiError(error: unknown): ApiClientError {
  if (!axios.isAxiosError(error)) {
    return new ApiClientError('Terjadi kesalahan yang tidak dikenal.')
  }
  const axiosError = error as AxiosError<APIErrorResponse>
  const apiError = axiosError.response?.data?.error
  if (apiError) {
    return new ApiClientError(apiError.message, {
      code: apiError.code,
      requestId: apiError.request_id,
      status: axiosError.response?.status,
    })
  }
  if (axiosError.code === 'ECONNABORTED') {
    return new ApiClientError('Backend membutuhkan waktu terlalu lama untuk merespons.', {
      code: 'CLIENT_TIMEOUT',
    })
  }
  if (!axiosError.response) {
    return new ApiClientError('Tidak dapat terhubung ke backend AlamatAI.', {
      code: 'NETWORK_ERROR',
    })
  }
  return new ApiClientError('Backend mengembalikan respons yang tidak dapat diproses.', {
    status: axiosError.response.status,
  })
}
