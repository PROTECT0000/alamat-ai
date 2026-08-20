import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="not-found container">
      <h1>Alamat halaman ini belum terselesaikan.</h1>
      <p>Route yang kamu buka tidak tersedia di AlamatAI.</p>
      <Link className="button button--primary" to="/"><ArrowLeft size={16} /> Kembali ke beranda</Link>
    </section>
  )
}
