import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true })
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  configurable: true,
})

