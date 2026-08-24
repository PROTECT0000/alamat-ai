import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App routes', () => {
  it('renders the editorial home page', () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /Alamat lebih jelas/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Coba parser/i })[0]).toHaveAttribute('href', '/parse')
  })

  it('renders the parser route and API key setup', () => {
    sessionStorage.clear()
    render(<MemoryRouter initialEntries={['/parse']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /Periksa alamat sebelum paket berangkat/i })).toBeInTheDocument()
    expect(screen.getByText('API key sesi diperlukan')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Alamat yang ingin dianalisis/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cepat/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /Normal/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText(/Alamat tidak disimpan oleh backend/i)).not.toBeInTheDocument()
  })

  it('renders a useful not-found page', () => {
    render(<MemoryRouter initialEntries={['/missing']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /Alamat halaman ini belum terselesaikan/i })).toBeInTheDocument()
  })

  it('renders the API documentation route', () => {
    render(<MemoryRouter initialEntries={['/docs']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /AlamatAI API Docs/i })).toBeInTheDocument()
    expect(screen.getByText('https://alamat-ai.akmalf475.workers.dev/v1/parse')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'API Docs' }).at(-1)).toHaveAttribute('href', '/docs')
    expect(screen.queryByText('Status backend')).not.toBeInTheDocument()
    expect(screen.queryByText('OpenAPI')).not.toBeInTheDocument()
  })
})
