import { AlertCircle, ArrowRight, KeyRound, LoaderCircle, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { ResultView } from '../components/ResultView'
import { sampleAddresses, useParserStore } from '../store/useParserStore'

export function ParserPage() {
  const { text, apiKey, result, status, error, setText, setApiKey, reset, parse } = useParserStore()
  const [keyDraft, setKeyDraft] = useState(apiKey)
  const [showSettings, setShowSettings] = useState(!apiKey)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void parse()
  }
  const saveKey = () => {
    setApiKey(keyDraft)
    if (keyDraft.trim()) setShowSettings(false)
  }

  return (
    <div className="parser-page">
      <section className="parser-heading">
        <div className="container">
          <span className="section-kicker">Alamat workbench</span>
          <h1>Periksa alamat sebelum paket berangkat.</h1>
          <p>Tempel satu alamat informal. AlamatAI akan memecah, mencocokkan, dan menunjukkan detail yang masih meragukan.</p>
        </div>
      </section>

      <section className="container parser-workspace">
        <div className="parser-column">
          <form className="input-card" onSubmit={submit}>
            <div className="input-card-heading">
              <div><span className="step-label">01 · Input</span><h2>Alamat mentah</h2></div>
              <button className="button button--ghost" type="button" onClick={reset}><RotateCcw size={15} /> Reset</button>
            </div>

            <label className="sr-only" htmlFor="address-input">Alamat yang ingin dianalisis</label>
            <textarea
              id="address-input"
              value={text}
              maxLength={2000}
              onChange={(event) => setText(event.target.value)}
              placeholder="Contoh: Jl. Mawar gg 3 dpn masjid..."
              rows={8}
            />
            <div className="textarea-meta"><span>Bahasa chat dan singkatan diperbolehkan</span><span>{text.length} / 2.000</span></div>

            <div className="sample-block">
              <span>Coba contoh</span>
              <div>{sampleAddresses.map((sample, index) => <button type="button" key={sample} onClick={() => setText(sample)}>Contoh {index + 1}</button>)}</div>
            </div>

            {!apiKey && <div className="key-notice"><KeyRound size={17} /><div><strong>API key sesi diperlukan</strong><span>Key disimpan hanya di session browser dan hilang saat tab ditutup.</span></div></div>}

            <div className="form-actions">
              <button className="button button--secondary" type="button" onClick={() => setShowSettings((value) => !value)}>
                <KeyRound size={15} /> {apiKey ? 'Ganti API key' : 'Atur API key'}
              </button>
              <button className="button button--primary button--submit" type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? <><LoaderCircle className="spin" size={16} /> Menganalisis…</> : <><Sparkles size={16} /> Analisis alamat <ArrowRight size={15} /></>}
              </button>
            </div>

            {showSettings && (
              <div className="api-key-panel">
                <div><span className="step-label">Koneksi backend</span><p>Masukkan nilai <code>APP_API_KEY</code> dari environment backend.</p></div>
                <div className="key-input-row">
                  <input type="password" value={keyDraft} onChange={(event) => setKeyDraft(event.target.value)} placeholder="Masukkan API key" autoComplete="off" />
                  <button className="button button--dark-small" type="button" onClick={saveKey}>Simpan sesi</button>
                </div>
                <span className="privacy-note"><ShieldCheck size={14} /> Tidak ditulis ke localStorage atau log aplikasi.</span>
              </div>
            )}

            {error && <div className="error-banner" role="alert"><AlertCircle size={18} /><div><strong>{error.code ?? 'REQUEST_FAILED'}</strong><span>{error.message}</span>{error.requestId && <code>request {error.requestId}</code>}</div></div>}
          </form>

          <div className="privacy-strip"><ShieldCheck size={17} /><p>Alamat tidak disimpan oleh backend. Input tetap dikirim ke provider LLM yang dikonfigurasi operator.</p></div>
        </div>

        <div className="result-column" aria-live="polite">
          {status === 'loading' && <LoadingResult />}
          {status !== 'loading' && result && <ResultView result={result} />}
          {status !== 'loading' && !result && <EmptyResult />}
        </div>
      </section>
    </div>
  )
}

function EmptyResult() {
  return (
    <div className="empty-result">
      <div className="empty-result-icon"><Sparkles size={24} /></div>
      <span className="step-label">02 · Hasil</span>
      <h2>Hasil analisis akan muncul di sini.</h2>
      <p>Field terstruktur, hierarchy administratif, temuan, dan pesan klarifikasi tampil dalam satu alur.</p>
      <div className="empty-lines"><span /><span /><span /><span /></div>
    </div>
  )
}

function LoadingResult() {
  return (
    <div className="loading-result" aria-label="Sedang menganalisis alamat">
      <div className="loading-heading"><span /><span /></div>
      <div className="loading-grid">{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div>
      <div className="loading-wide" />
    </div>
  )
}

