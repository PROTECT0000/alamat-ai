import { Braces, CheckCircle2, KeyRound, Send, Terminal } from 'lucide-react'

const endpoint = 'https://alamat-ai.akmalf475.workers.dev/v1/parse'

const curlExample = `curl --request POST \\
  --url ${endpoint} \\
  --header 'Content-Type: application/json' \\
  --header 'X-API-Key: YOUR_API_KEY' \\
  --data '{
    "text": "Jl. Mawar gg 3 depan masjid Al-Ikhlas RT 5/2 Bekasi",
    "mode": "normal"
  }'`

const clarificationExample = `curl --request POST \\
  --url ${endpoint} \\
  --header 'Content-Type: application/json' \\
  --header 'X-API-Key: YOUR_API_KEY' \\
  --data '{
    "text": "Jl. Mawar gg 3 depan masjid Al-Ikhlas RT 5/2 Bekasi",
    "mode": "normal",
    "clarifications": [
      {
        "question": "Kabupaten Bekasi atau Kota Bekasi? Boleh dibantu nomor-nya?",
        "answer": "Kota Bekasi, nomor 12"
      }
    ]
  }'`

const responseExample = `{
  "request_id": "req_01J...",
  "address": {
    "jalan": "Jalan Mawar Gang 3",
    "nomor": null,
    "rt": "005",
    "rw": "002",
    "blok": null,
    "unit": null,
    "desa_kelurahan": null,
    "kecamatan": null,
    "kabupaten_kota": "Kota Bekasi",
    "provinsi": "Jawa Barat",
    "kode_pos": null,
    "patokan": "depan Masjid Al-Ikhlas",
    "penerima": null,
    "kontak": null,
    "catatan": null
  },
  "validation": {
    "status": "needs_clarification",
    "admin": {
      "desa_kelurahan": { "input": null, "code": null, "name": null, "match": "none", "score": 0 },
      "kecamatan": { "input": null, "code": null, "name": null, "match": "none", "score": 0 },
      "kabupaten_kota": { "input": "Bekasi", "code": "32.75", "name": "Kota Bekasi", "match": "alias", "score": 1 },
      "provinsi": { "input": null, "code": "32", "name": "Jawa Barat", "match": "inferred", "score": 1 }
    }
  },
  "issues": [],
  "clarification_message": "Kelurahan dan kecamatannya apa?",
  "meta": {
    "model": "configured-model",
    "inference_mode": "normal",
    "llm_attempts": 1,
    "latency_ms": 1240,
    "gazetteer_version": "2025"
  }
}`

const errorExample = `{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "API key tidak valid.",
    "request_id": "req_01J..."
  }
}`

export function ApiDocsPage() {
  return (
    <div className="api-docs-page">
      <section className="api-docs-hero">
        <div className="container narrow-container">
          <div className="api-docs-mark"><Braces size={22} /></div>
          <h1>AlamatAI API Docs</h1>
          <p>Ubah satu alamat Indonesia informal menjadi field terstruktur, lalu validasi hierarchy administratifnya.</p>
        </div>
      </section>

      <div className="container api-docs-layout">
        <aside className="api-docs-nav" aria-label="Daftar isi API">
          <strong>Parse address</strong>
          <a href="#endpoint">Endpoint</a>
          <a href="#authentication">Authentication</a>
          <a href="#request">Request</a>
          <a href="#response">Response</a>
          <a href="#errors">Errors</a>
        </aside>

        <main className="api-docs-content">
          <section className="docs-section" id="endpoint" aria-labelledby="endpoint-title">
            <div className="docs-section-heading">
              <span><Send size={17} /></span>
              <div><h2 id="endpoint-title">Parse address</h2><p>Memproses tepat satu alamat per request.</p></div>
            </div>
            <div className="endpoint-bar">
              <span>POST</span>
              <code>{endpoint}</code>
            </div>
          </section>

          <section className="docs-section" id="authentication" aria-labelledby="authentication-title">
            <div className="docs-section-heading">
              <span><KeyRound size={17} /></span>
              <div><h2 id="authentication-title">Authentication</h2><p>Kirim API key melalui header pada setiap request.</p></div>
            </div>
            <div className="docs-callout">
              <code>X-API-Key: YOUR_API_KEY</code>
              <p>Jangan menaruh key di repository atau membagikannya melalui log aplikasi.</p>
            </div>
          </section>

          <section className="docs-section" id="request" aria-labelledby="request-title">
            <div className="docs-section-heading">
              <span><Terminal size={17} /></span>
              <div><h2 id="request-title">Request</h2><p>Body JSON berisi alamat, mode inference, dan riwayat klarifikasi opsional.</p></div>
            </div>
            <div className="schema-table" role="table" aria-label="Request fields">
              <div className="schema-row schema-row--heading" role="row"><span>Field</span><span>Type</span><span>Description</span></div>
              <div className="schema-row" role="row"><code>text</code><span>string · required</span><span>Alamat mentah, 1–2.000 karakter.</span></div>
              <div className="schema-row" role="row"><code>mode</code><span>fast | normal · optional</span><span><code>fast</code> mengurangi reasoning dan output token. Default: <code>normal</code>.</span></div>
              <div className="schema-row" role="row"><code>clarifications</code><span>array · optional</span><span>Maksimal 8 pasangan <code>question</code> dan <code>answer</code>. Seluruh riwayat dikirim ulang setiap reply.</span></div>
            </div>
            <CodeBlock label="cURL" code={curlExample} />
            <CodeBlock label="Reply klarifikasi" code={clarificationExample} />
          </section>

          <section className="docs-section" id="response" aria-labelledby="response-title">
            <div className="docs-section-heading">
              <span><CheckCircle2 size={17} /></span>
              <div><h2 id="response-title">Response</h2><p>HTTP 200 berarti request selesai diproses. Jika <code>clarification_message</code> terisi, kirim pertanyaan itu bersama jawaban pengguna pada request berikutnya.</p></div>
            </div>
            <div className="response-statuses">
              <article><code>valid</code><p>Hierarchy administratif cocok dan tidak ada masalah pemblokir.</p></article>
              <article><code>needs_clarification</code><p>Alamat perlu detail tambahan atau masih ambigu.</p></article>
              <article><code>invalid</code><p>Input bukan alamat atau memiliki konflik yang tidak dapat diterima.</p></article>
            </div>
            <CodeBlock label="200 application/json" code={responseExample} />
          </section>

          <section className="docs-section" id="errors" aria-labelledby="errors-title">
            <div className="docs-section-heading">
              <span><Braces size={17} /></span>
              <div><h2 id="errors-title">Errors</h2><p>Semua kegagalan menggunakan envelope error yang konsisten dan menyertakan request ID.</p></div>
            </div>
            <div className="error-status-list">
              <div><code>400</code><span>Request atau JSON tidak valid</span></div>
              <div><code>401</code><span>API key hilang atau tidak valid</span></div>
              <div><code>413 / 415 / 422</code><span>Payload, content type, atau validasi input bermasalah</span></div>
              <div><code>429</code><span>Terlalu banyak request</span></div>
              <div><code>500 / 502 / 503 / 504</code><span>Masalah internal, konfigurasi, atau provider LLM</span></div>
            </div>
            <CodeBlock label="Error application/json" code={errorExample} />
          </section>
        </main>
      </div>
    </div>
  )
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="docs-code-block">
      <div><span>{label}</span></div>
      <pre><code>{code}</code></pre>
    </div>
  )
}
