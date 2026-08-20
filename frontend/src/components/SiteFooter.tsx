import { Link } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link className="brand" to="/">
            <span>ALAMAT AI</span>
          </Link>
          <p>Lapisan kecerdasan alamat untuk pengiriman Indonesia yang lebih pasti.</p>
        </div>
        <div>
          <h3>Produk</h3>
          <Link to="/parse">Parser alamat</Link>
          <Link to="/about">Cara kerja</Link>
        </div>
        <div>
          <h3>Teknologi</h3>
          <a href="/api/readyz">Status backend</a>
          <a href="/openapi.yaml">OpenAPI</a>
        </div>
        <div>
          <h3>Prinsip</h3>
          <Link to="/about#privacy">Privasi</Link>
          <Link to="/about#data">Provenance data</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 AlamatAI</span>
        <span>Dibangun untuk alamat Indonesia.</span>
      </div>
    </footer>
  )
}
