import { Check, MapPin, MessageSquareText, Sparkles } from 'lucide-react'

export function ProductPreview() {
  return (
    <div className="product-preview" aria-label="Pratinjau antarmuka AlamatAI">
      <div className="preview-window">
        <div className="preview-toolbar">
          <div className="window-dots" aria-hidden="true"><span /><span /><span /></div>
          <span className="preview-url">app.alamatai.id/parse</span>
          <span className="preview-live"><span /> live</span>
        </div>
        <div className="preview-body">
          <section className="preview-input-panel">
            <div className="preview-label"><Sparkles size={13} /> Alamat masuk</div>
            <p>Jl. Mawar gg 3 dpn masjid Al-Ikhlas rt5/2 bekasi</p>
            <div className="preview-button">Analisis alamat</div>
          </section>
          <section className="preview-result-panel">
            <div className="preview-result-heading">
              <span className="preview-label"><Check size={13} /> Hasil terstruktur</span>
              <span className="mini-badge">Perlu konfirmasi</span>
            </div>
            <div className="preview-fields">
              <div><span>Jalan</span><strong>Jl. Mawar</strong></div>
              <div><span>RT / RW</span><strong>05 / 02</strong></div>
              <div><span>Patokan</span><strong>Masjid Al-Ikhlas</strong></div>
              <div><span>Wilayah</span><strong>Bekasi · ambigu</strong></div>
            </div>
            <div className="preview-clarification">
              <MessageSquareText size={16} />
              <span>Alamatnya di Kota Bekasi atau Kabupaten Bekasi ya?</span>
            </div>
          </section>
        </div>
      </div>
      <div className="preview-phone" aria-hidden="true">
        <div className="phone-notch" />
        <MapPin size={22} />
        <strong>Alamat diperiksa</strong>
        <span>4 wilayah terdeteksi</span>
        <div className="phone-line" />
        <div className="phone-line phone-line--short" />
      </div>
    </div>
  )
}

