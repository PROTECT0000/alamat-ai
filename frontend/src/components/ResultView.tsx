import { AlertTriangle, Check, ChevronRight, Clipboard, ClipboardCheck, Code2, MessageSquareText } from 'lucide-react'
import { useState } from 'react'
import type { AdminMatch, Issue, ParseResponse, ParsedAddress, ValidationStatus } from '../types/api'

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

export function ResultView({ result }: { result: ParseResponse }) {
  const [copied, setCopied] = useState(false)
  const copyClarification = async () => {
    if (!result.clarification_message) return
    await navigator.clipboard.writeText(result.clarification_message)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
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

      {result.clarification_message && (
        <section className="clarification-card">
          <div className="clarification-icon"><MessageSquareText size={19} /></div>
          <div>
            <span>Siap dikirim ke pelanggan</span>
            <p>{result.clarification_message}</p>
          </div>
          <button className="icon-button" type="button" onClick={copyClarification} aria-label="Salin pesan klarifikasi">
            {copied ? <ClipboardCheck size={18} /> : <Clipboard size={18} />}
          </button>
        </section>
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
