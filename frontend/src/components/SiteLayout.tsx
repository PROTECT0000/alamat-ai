import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

export function SiteLayout() {
  const location = useLocation()
  useEffect(() => {
    if (location.hash) {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname, location.hash])

  return (
    <div className="site-shell">
      <SiteHeader />
      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
