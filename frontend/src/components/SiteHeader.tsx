import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { BrandMark } from './BrandMark'

const navItems = [
  { to: '/', label: 'Beranda', end: true },
  { to: '/parse', label: 'Parser' },
  { to: '/about', label: 'Tentang' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="site-header">
      <div className="container nav-shell">
        <Link className="brand" to="/" aria-label="AlamatAI beranda" onClick={() => setOpen(false)}>
          <BrandMark />
          <span>AlamatAI</span>
        </Link>
        <nav className={open ? 'nav-links nav-links--open' : 'nav-links'} aria-label="Navigasi utama">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <Link className="button button--primary nav-cta" to="/parse" onClick={() => setOpen(false)}>
            Coba parser
          </Link>
        </nav>
        <button
          className="menu-button"
          type="button"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  )
}

