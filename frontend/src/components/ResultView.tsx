import { AlertTriangle, Check, ChevronRight, Code2, LoaderCircle, MessageSquareText, Send } from 'lucide-react'
import type { FormEvent } from 'react'
import type { AdminMatch, ClarificationTurn, Issue, ParseResponse, ParsedAddress, ValidationStatus } from '../types/api'

const addressFields: Array<{ key: keyof ParsedAddress; label: string }> = [
  { key: 'jalan', label: 'Jalan' }, { key: 'nomor', label: 'Nomor' },
  { key: 'rt', label: 'RT' }, { key: 'rw', label: 'RW' },
  { key: 'blok', label: 'Blok' }, { key: 'unit', label: 'Unit' },
  { key: 'desa_kelurahan', label: 'Desa / Kelurahan' }, { key: 'kecamatan', label: 'Kecamatan' },
  { key: 'kabupaten_kota', label: 'Kabupaten / Kota' }, { key: 'provinsi', label: 'Provinsi' },
  { key: 'kode_pos', label: 'Kode pos' }, { key: 'patokan', label: 'Patokan' },
  { key: 'penerima', label: 'Penerima' }, { key: 'kontak', label: 'Kontak' },
  { key: 'catatan', label: 'Catatan' },
]

const adminLevels: Array<{ key: 'desa_kelurahan' | 'kecamatan' | 'kabupaten_kota' | 'provinsi'; label: string }> = [
  { key: 'desa_kelurahan', label: 'Desa / Kelurahan' },
  { key: 'kecamatan', label: 'Kecamatan' },
  { key: 'kabupaten_kota', label: 'Kabupaten / Kota' },
  { key: 'provinsi', label: 'Provinsi' },
]

interface ResultViewProps {
  result: ParseResponse
  clarifications: ClarificationTurn[]
  replyDraft: string
  isReplying: boolean
  onReplyDraftChange: (value: string) => void
  onReply: () => void
}

export function ResultView({
  result,
  clarifications,
  replyDraft,
  isReplying,
  onReplyDraftChange,
  onReply,
}: ResultViewProps) {
  const submitReply = (event: FormEvent) => {
    event.preventDefault()
    onReply()
  }

  return (
    <div className="result-stack">
      <section className="result-card result-summary">
        <div>
          <h2>{statusTitle(result.validation.status)}</h2>
        </div>
        <StatusBadge status={result.validation.status} />
        <div className="result-meta">
          <span>{result.meta.inference_mode === 'fast' ? 'Fast mode' : 'Normal mode'}</span>
          <span>{result.meta.latency_ms} ms</span>
          <span>{result.meta.llm_attempts} LLM attempt{result.meta.llm_attempts > 1 ? 's' : ''}</span>
          <span>{result.meta.model}</span>
        </div>
      </section>

      {(clarifications.length > 0 || result.clarification_message) && (
        <ClarificationChat
          turns={clarifications}
          question={result.clarification_message}
          complete={result.validation.status === 'valid'}
          replyDraft={replyDraft}
          isReplying={isReplying}
          onReplyDraftChange={onReplyDraftChange}
          onSubmit={submitReply}
        />
      )}

      <section className="result-card">
        <div className="card-heading"><div><h3>Field alamat</h3></div></div>
        <div className="field-grid">
          {addressFields.map(({ key, label }) => (
            <div className={result.address[key] ? 'field-item' : 'field-item field-item--empty'} key={key}>
              <span>{label}</span>
              <strong>{result.address[key] ?? 'Belum ditemukan'}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="result-card">
        <div className="card-heading"><div><h3>Hierarchy administratif</h3></div></div>
        <div className="admin-list">
          {adminLevels.map(({ key, label }, index) => (
            <AdminRow label={label} match={result.validation.admin[key]} last={index === adminLevels.length - 1} key={key} />
          ))}
        </div>
      </section>

      {result.issues.length > 0 && (
        <section className="result-card">
          <div className="card-heading"><div><h3>{result.issues.length} temuan</h3></div></div>
          <div className="issue-list">
            {result.issues.map((issue, index) => <IssueRow issue={issue} key={`${issue.code}-${issue.field}-${index}`} />)}
          </div>
        </section>
      )}

      <details className="raw-json">
        <summary><Code2 size={16} /> Lihat respons JSON <ChevronRight size={15} /></summary>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </details>
    </div>
  )
}

function ClarificationChat({
  turns,
  question,
  complete,
  replyDraft,
  isReplying,
  onReplyDraftChange,
  onSubmit,
}: {
  turns: ClarificationTurn[]
  question: string | null
  complete: boolean
  replyDraft: string
  isReplying: boolean
  onReplyDraftChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}) {
  const canReply = question !== null && turns.length < 8
  return (
    <section className="clarification-chat" aria-labelledby="clarification-chat-title">
      <div className="chat-heading">
        <div className="clarification-icon"><MessageSquareText size={19} /></div>
        <div>
          <h3 id="clarification-chat-title">Lengkapi alamat lewat chat</h3>
          <p>Jawaban berikutnya akan digabungkan ke field alamat yang masih kurang.</p>
        </div>
      </div>

      <div className="chat-thread">
        {turns.map((turn, index) => (
          <div className="chat-turn" key={`${turn.question}-${index}`}>
            <div className="chat-bubble chat-bubble--ai"><span>AlamatAI</span><p>{turn.question}</p></div>
            <div className="chat-bubble chat-bubble--user"><span>Balasan kamu</span><p>{turn.answer}</p></div>
          </div>
        ))}
        {question && <div className="chat-bubble chat-bubble--ai"><span>AlamatAI</span><p>{question}</p></div>}
        {complete && <div className="chat-complete"><Check size={15} /><span>Detail alamat sudah cukup dan berhasil divalidasi.</span></div>}
      </div>

      {canReply && (
        <form className="chat-reply-form" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="clarification-reply">Balas pertanyaan klarifikasi</label>
          <textarea
            id="clarification-reply"
            value={replyDraft}
            maxLength={1000}
            rows={3}
            disabled={isReplying}
            onChange={(event) => onReplyDraftChange(event.target.value)}
            placeholder="Contoh: Kota Bekasi, nomor 12"
          />
          <div>
            <span>{turns.length} / 8 balasan</span>
            <button className="button button--primary" type="submit" disabled={isReplying || !replyDraft.trim()}>
              {isReplying ? <><LoaderCircle className="spin" size={15} /> Memperbarui…</> : <><Send size={15} /> Kirim balasan</>}
            </button>
          </div>
        </form>
      )}
      {question && !canReply && <p className="chat-limit">Batas klarifikasi tercapai. Perbarui alamat mentah lalu analisis ulang.</p>}
    </section>
  )
}

export function StatusBadge({ status }: { status: ValidationStatus }) {
  const labels: Record<ValidationStatus, string> = {
    valid: 'Alamat valid', needs_clarification: 'Perlu konfirmasi', invalid: 'Bukan alamat',
  }
  return <span className={`status-badge status-badge--${status}`}>{status === 'valid' ? <Check size={13} /> : <AlertTriangle size={13} />}{labels[status]}</span>
}

function AdminRow({ label, match, last }: { label: string; match: AdminMatch; last: boolean }) {
  return (
    <div className="admin-row">
      <div className={match.code ? 'admin-node admin-node--found' : 'admin-node'}>{match.code ? <Check size={13} /> : '—'}</div>
      {!last && <span className="admin-rail" />}
      <div><span>{label}</span><strong>{match.name ?? match.input ?? 'Belum terselesaikan'}</strong></div>
      <div className="admin-match"><span>{match.match}</span>{match.code && <code>{match.code}</code>}</div>
    </div>
  )
}

function IssueRow({ issue }: { issue: Issue }) {
  return (
    <article className={`issue-row issue-row--${issue.severity}`}>
      <AlertTriangle size={17} />
      <div><span>{humanizeCode(issue.code)}</span><p>{issue.message}</p>{issue.candidates.length > 0 && <div className="candidate-list">{issue.candidates.map((candidate) => <span key={candidate.code}>{candidate.name}</span>)}</div>}</div>
    </article>
  )
}

function statusTitle(status: ValidationStatus) {
  if (status === 'valid') return 'Alamat siap digunakan'
  if (status === 'invalid') return 'Teks belum bisa dikenali'
  return 'Ada detail yang perlu dipastikan'
}

function humanizeCode(code: string) {
  return code.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
