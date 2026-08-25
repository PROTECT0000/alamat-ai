import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ParseResponse } from '../types/api'
import { ResultView } from './ResultView'

const result: ParseResponse = {
  request_id: 'request',
  address: {
    jalan: 'Jl. Mawar', nomor: null, rt: null, rw: null, blok: null, unit: null,
    desa_kelurahan: 'Sukamaju', kecamatan: 'Cilodong', kabupaten_kota: 'Kota Depok',
    provinsi: 'Jawa Barat', kode_pos: '16415', patokan: null, penerima: null, kontak: null, catatan: null,
  },
  validation: {
    status: 'needs_clarification',
    admin: {
      desa_kelurahan: { input: 'Sukamaju', code: '32.76.01.1001', name: 'Sukamaju', match: 'exact', score: 1 },
      kecamatan: { input: 'Cilodong', code: '32.76.01', name: 'Cilodong', match: 'exact', score: 1 },
      kabupaten_kota: { input: 'Kota Depok', code: '32.76', name: 'Kota Depok', match: 'exact', score: 1 },
      provinsi: { input: 'Jawa Barat', code: '32', name: 'Jawa Barat', match: 'exact', score: 1 },
    },
  },
  issues: [],
  clarification_message: 'Boleh dibantu nomor rumahnya?',
  meta: { model: 'test', inference_mode: 'normal', llm_attempts: 1, latency_ms: 10, gazetteer_version: 'test' },
}

describe('ResultView clarification chat', () => {
  it('shows prior turns and submits the next reply', () => {
    const onReply = vi.fn()
    render(
      <ResultView
        result={result}
        clarifications={[{ question: 'Kota atau Kabupaten Depok?', answer: 'Kota Depok' }]}
        replyDraft="Nomor 12"
        isReplying={false}
        onReplyDraftChange={vi.fn()}
        onReply={onReply}
      />,
    )

    expect(screen.getByText('Kota atau Kabupaten Depok?')).toBeInTheDocument()
    expect(screen.getAllByText('Kota Depok')).not.toHaveLength(0)
    expect(screen.getByText('Boleh dibantu nomor rumahnya?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Kirim balasan/i }))
    expect(onReply).toHaveBeenCalledOnce()
  })
})
