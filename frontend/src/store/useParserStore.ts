import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { ApiClientError, parseAddress } from '../services/api'
import type { ClarificationTurn, InferenceMode, ParseResponse } from '../types/api'

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

interface ParserState {
  text: string
  apiKey: string
  mode: InferenceMode
  clarifications: ClarificationTurn[]
  replyDraft: string
  result: ParseResponse | null
  status: RequestStatus
  error: ApiClientError | null
  setText: (text: string) => void
  setApiKey: (apiKey: string) => void
  setMode: (mode: InferenceMode) => void
  setReplyDraft: (replyDraft: string) => void
  clearResult: () => void
  reset: () => void
  parse: () => Promise<void>
  reply: () => Promise<void>
}

const initialText = 'Jl. Mawar gg 3 depan masjid Al-Ikhlas RT 5/2 Bekasi'

export const useParserStore = create<ParserState>()(
  persist(
    (set, get) => ({
      text: initialText,
      apiKey: '',
      mode: 'normal',
      clarifications: [],
      replyDraft: '',
      result: null,
      status: 'idle',
      error: null,
      setText: (text) => set({ text, result: null, clarifications: [], replyDraft: '', status: 'idle', error: null }),
      setApiKey: (apiKey) => set({ apiKey: apiKey.trim(), error: null }),
      setMode: (mode) => set({ mode, error: null }),
      setReplyDraft: (replyDraft) => set({ replyDraft, error: null }),
      clearResult: () => set({ result: null, clarifications: [], replyDraft: '', status: 'idle', error: null }),
      reset: () => set({ text: initialText, result: null, clarifications: [], replyDraft: '', status: 'idle', error: null }),
      parse: async () => {
        const { text, apiKey, mode } = get()
        const trimmed = text.trim()
        if (!apiKey) {
          set({ status: 'error', error: new ApiClientError('Masukkan API key sesi terlebih dahulu.', { code: 'MISSING_API_KEY' }) })
          return
        }
        if (!trimmed) {
          set({ status: 'error', error: new ApiClientError('Alamat tidak boleh kosong.', { code: 'EMPTY_ADDRESS' }) })
          return
        }
        set({ result: null, clarifications: [], replyDraft: '', status: 'loading', error: null })
        try {
          const result = await parseAddress(trimmed, apiKey, mode, [])
          set({ result, status: 'success', error: null })
        } catch (error) {
          set({
            status: 'error',
            error: error instanceof ApiClientError ? error : new ApiClientError('Gagal memproses alamat.'),
          })
        }
      },
      reply: async () => {
        const { text, apiKey, mode, result, clarifications, replyDraft } = get()
        const answer = replyDraft.trim()
        const question = result?.clarification_message
        if (!apiKey) {
          set({ status: 'error', error: new ApiClientError('Masukkan API key sesi terlebih dahulu.', { code: 'MISSING_API_KEY' }) })
          return
        }
        if (!question) {
          set({ status: 'error', error: new ApiClientError('Tidak ada pertanyaan klarifikasi yang perlu dijawab.', { code: 'NO_CLARIFICATION' }) })
          return
        }
        if (!answer) {
          set({ status: 'error', error: new ApiClientError('Balasan klarifikasi tidak boleh kosong.', { code: 'EMPTY_REPLY' }) })
          return
        }
        if (Array.from(answer).length > 1000) {
          set({ status: 'error', error: new ApiClientError('Balasan maksimal 1.000 karakter.', { code: 'REPLY_TOO_LONG' }) })
          return
        }
        if (clarifications.length >= 8) {
          set({ status: 'error', error: new ApiClientError('Batas 8 balasan klarifikasi sudah tercapai.', { code: 'CLARIFICATION_LIMIT' }) })
          return
        }
        const nextClarifications = [...clarifications, { question, answer }]
        set({ status: 'loading', error: null })
        try {
          const nextResult = await parseAddress(text.trim(), apiKey, mode, nextClarifications)
          set({ result: nextResult, clarifications: nextClarifications, replyDraft: '', status: 'success', error: null })
        } catch (error) {
          set({
            status: 'error',
            error: error instanceof ApiClientError ? error : new ApiClientError('Gagal mengirim balasan klarifikasi.'),
          })
        }
      },
    }),
    {
      name: 'alamatai-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ apiKey: state.apiKey, mode: state.mode }),
    },
  ),
)

export const sampleAddresses = [
  'Jl. Mawar No. 12, Sukamaju, Cilodong, Kota Depok, Jawa Barat',
  'gg melati rt03 rw07 dpn masjid al ikhlas bogor',
  'Rina 08123456789 tower B lt 5 unit 12, Kuningan, Jakarta Selatan',
]
