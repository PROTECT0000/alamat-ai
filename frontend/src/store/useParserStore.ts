import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { ApiClientError, parseAddress } from '../services/api'
import type { ParseResponse } from '../types/api'

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

interface ParserState {
  text: string
  apiKey: string
  result: ParseResponse | null
  status: RequestStatus
  error: ApiClientError | null
  setText: (text: string) => void
  setApiKey: (apiKey: string) => void
  clearResult: () => void
  reset: () => void
  parse: () => Promise<void>
}

const initialText = 'Jl. Mawar gg 3 depan masjid Al-Ikhlas RT 5/2 Bekasi'

export const useParserStore = create<ParserState>()(
  persist(
    (set, get) => ({
      text: initialText,
      apiKey: '',
      result: null,
      status: 'idle',
      error: null,
      setText: (text) => set({ text, error: null }),
      setApiKey: (apiKey) => set({ apiKey: apiKey.trim(), error: null }),
      clearResult: () => set({ result: null, status: 'idle', error: null }),
      reset: () => set({ text: initialText, result: null, status: 'idle', error: null }),
      parse: async () => {
        const { text, apiKey } = get()
        const trimmed = text.trim()
        if (!apiKey) {
          set({ status: 'error', error: new ApiClientError('Masukkan API key sesi terlebih dahulu.', { code: 'MISSING_API_KEY' }) })
          return
        }
        if (!trimmed) {
          set({ status: 'error', error: new ApiClientError('Alamat tidak boleh kosong.', { code: 'EMPTY_ADDRESS' }) })
          return
        }
        set({ status: 'loading', error: null })
        try {
          const result = await parseAddress(trimmed, apiKey)
          set({ result, status: 'success', error: null })
        } catch (error) {
          set({
            status: 'error',
            error: error instanceof ApiClientError ? error : new ApiClientError('Gagal memproses alamat.'),
          })
        }
      },
    }),
    {
      name: 'alamatai-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ apiKey: state.apiKey }),
    },
  ),
)

export const sampleAddresses = [
  'Jl. Mawar No. 12, Sukamaju, Cilodong, Kota Depok, Jawa Barat',
  'gg melati rt03 rw07 dpn masjid al ikhlas bogor',
  'Rina 08123456789 tower B lt 5 unit 12, Kuningan, Jakarta Selatan',
]

