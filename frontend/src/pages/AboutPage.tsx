import { ArrowRight, Braces, Database, EyeOff, FileCheck2, Network, ServerCog, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="container narrow-container">
          <h1>Memahami bahasa manusia, memvalidasi dengan aturan yang bisa diperiksa.</h1>
          <p>AlamatAI memisahkan ekstraksi berbasis LLM dari keputusan administratif yang deterministik.</p>
        </div>
      </section>

      <section className="section">
        <div className="container architecture-grid">
          <div className="architecture-copy">
            <h2>Satu pipeline, batas tanggung jawab yang tegas.</h2>
            <p>Model boleh mengusulkan estimasi wilayah, tetapi gazetteer dan data kode pos tetap memeriksa hierarchy sebelum hasil digunakan.</p>
          </div>
          <div className="architecture-flow">
            <article><span><Braces size={19} /></span><div><small>01</small><h3>OpenAI-compatible reasoning</h3><p>Mengambil field eksplisit dan memperkirakan wilayah yang belum disebutkan.</p></div></article>
            <article><span><Database size={19} /></span><div><small>02</small><h3>Gazetteer resolution</h3><p>Exact, alias, fuzzy, dan parent-child validation.</p></div></article>
            <article><span><Network size={19} /></span><div><small>03</small><h3>Issue classification</h3><p>Membedakan data hilang, ambigu, salah hierarchy, dan non-address.</p></div></article>
            <article><span><FileCheck2 size={19} /></span><div><small>04</small><h3>Clarification template</h3><p>Menyusun maksimal dua pertanyaan Bahasa Indonesia.</p></div></article>
          </div>
        </div>
      </section>

      <section className="section section--dark" id="privacy">
        <div className="container dark-section-grid">
          <div><h2>PII diperlakukan sebagai data sensitif, bukan telemetry.</h2></div>
          <div className="dark-points">
            <article><EyeOff size={20} /><div><h3>Tidak masuk log</h3><p>Alamat, penerima, kontak, API key, dan raw model response dikeluarkan dari structured logs.</p></div></article>
            <article><ShieldCheck size={20} /><div><h3>Tidak disimpan</h3><p>Worker tidak memiliki database transaksi atau history alamat.</p></div></article>
            <article><ServerCog size={20} /><div><h3>Provider eksplisit</h3><p>Input dikirim ke LLM provider yang dipilih operator. Klaim lokal hanya sah untuk model lokal.</p></div></article>
          </div>
        </div>
      </section>

      <section className="section" id="data">
        <div className="container data-section">
          <div className="data-copy"><h2>91.599 wilayah, sumbernya disebut sesuai perannya.</h2><p>Snapshot machine-readable dipin, diberi checksum, dan diverifikasi sebelum diimpor ke Cloudflare D1.</p></div>
          <div className="data-card">
            <div><span>Official benchmark</span><strong>Kepmendagri</strong><small>Dokumen pembanding jumlah</small></div>
            <div><span>Machine-readable primary</span><strong>cahyadsn/wilayah</strong><small>MIT · pinned commit</small></div>
            <div><span>Verification</span><strong>38 / 514 / 7.285 / 83.762</strong><small>0 duplicate · 0 orphan</small></div>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-inner"><h2>Uji dengan alamat yang benar-benar kamu terima.</h2><Link className="button button--primary button--large" to="/parse">Buka parser <ArrowRight size={16} /></Link></div>
      </section>
    </div>
  )
}
