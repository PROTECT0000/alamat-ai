import { ArrowRight, Braces, Database, MessageSquareText, ScanText, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProductPreview } from '../components/ProductPreview'

const features = [
  {
    icon: ScanText,
    title: 'Pahami teks apa adanya',
    body: 'Singkatan, urutan bebas, patokan, dan bahasa chat diurai menjadi 15 field alamat yang konsisten.',
  },
  {
    icon: Database,
    title: 'Validasi sampai kelurahan',
    body: 'Nama wilayah dicocokkan terhadap 91.599 unit administratif dengan hierarchy yang dapat diaudit.',
  },
  {
    icon: MessageSquareText,
    title: 'Tanya yang memang kurang',
    body: 'Alamat ambigu menghasilkan pesan klarifikasi singkat yang siap dikirim kembali ke pelanggan.',
  },
]

export function HomePage() {
  return (
    <>
      <section className="hero-band">
        <div className="hero-wash" aria-hidden="true" />
        <div className="container hero-copy">
          <h1>Alamat lebih jelas.<br />Pengiriman lebih pasti.</h1>
          <p>
            AlamatAI mengubah alamat informal menjadi data terstruktur, memeriksa hierarchy wilayah,
            dan menunjukkan hal yang perlu dikonfirmasi—sebelum paket berangkat.
          </p>
          <div className="hero-actions">
            <Link className="button button--primary button--large" to="/parse">
              Coba parser <ArrowRight size={16} />
            </Link>
            <Link className="text-link" to="/about">Lihat cara kerjanya <ArrowRight size={15} /></Link>
          </div>
        </div>
        <div className="container hero-preview-wrap">
          <ProductPreview />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <h2>Bukan sekadar memecah teks.</h2>
            <p>Setiap lapisan punya peran yang jelas, sehingga hasilnya mudah diperiksa dan tidak menutupi ambiguitas.</p>
          </div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, body }, index) => (
              <article className={index === 1 ? 'feature-card feature-card--dark' : 'feature-card'} key={title}>
                <span className="feature-icon"><Icon size={21} /></span>
                <span className="feature-index">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container workflow-layout">
          <div className="workflow-copy">
            <h2>Alur kecil yang menjaga paket tetap di jalur.</h2>
            <p>LLM dipakai untuk memahami bahasa. Cloudflare Worker dan gazetteer D1 tetap memegang keputusan validasi.</p>
            <Link className="text-link" to="/about">Pelajari arsitektur <ArrowRight size={15} /></Link>
          </div>
          <div className="workflow-steps">
            <article>
              <span>1</span><div><h3>Ekstraksi dan estimasi</h3><p>LLM mengambil nilai tertulis dan mengestimasi wilayah yang hilang dari petunjuk alamat.</p></div>
            </article>
            <article>
              <span>2</span><div><h3>Validasi</h3><p>Gazetteer memeriksa kecocokan nama, parent-child, typo, dan wilayah kembar.</p></div>
            </article>
            <article>
              <span>3</span><div><h3>Klarifikasi</h3><p>Template deterministik menyusun maksimal dua pertanyaan yang paling penting.</p></div>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container trust-grid">
          <div className="trust-copy">
            <h2>Jujur ketika tahu.<br />Jelas ketika ragu.</h2>
          </div>
          <div className="trust-points">
            <article><ShieldCheck size={20} /><div><h3>Privasi eksplisit</h3><p>Tidak menyimpan alamat dan tidak menulis PII ke log.</p></div></article>
            <article><Braces size={20} /><div><h3>Contract-first API</h3><p>Frontend dan Worker berbagi OpenAPI sebagai sumber kebenaran.</p></div></article>
            <article><Database size={20} /><div><h3>Provenance terbuka</h3><p>Versi dan peran setiap sumber data tersedia di readiness endpoint.</p></div></article>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-inner">
          <h2>Dari teks berantakan menjadi langkah berikutnya.</h2>
          <Link className="button button--primary button--large" to="/parse">Buka parser <ArrowRight size={16} /></Link>
        </div>
      </section>
    </>
  )
}
