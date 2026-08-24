import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from './components/SiteLayout'
import { AboutPage } from './pages/AboutPage'
import { ApiDocsPage } from './pages/ApiDocsPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ParserPage } from './pages/ParserPage'

export function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="parse" element={<ParserPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="docs" element={<ApiDocsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
