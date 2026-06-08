import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { LazyQR } from '@/components/ui/LazyQR'

describe('LazyQR', () => {
  it('muestra fallback de carga inmediatamente', () => {
    const { container } = render(<LazyQR value="https://example.com" size={128} />)
    const fallback = container.querySelector('[aria-label="Cargando código QR"]')
    expect(fallback).not.toBeNull()
    expect((fallback as HTMLElement).className).toContain('animate-pulse')
  })

  it('respeta size en el fallback', () => {
    const { container } = render(<LazyQR value="x" size={200} />)
    const fallback = container.querySelector('[aria-label="Cargando código QR"]') as HTMLElement
    expect(fallback.style.width).toBe('200px')
    expect(fallback.style.height).toBe('200px')
  })

  it('usa size 128 por defecto si no se pasa', () => {
    const { container } = render(<LazyQR value="x" />)
    const fallback = container.querySelector('[aria-label="Cargando código QR"]') as HTMLElement
    expect(fallback.style.width).toBe('128px')
  })

  it('eventualmente renderiza el QR (svg)', async () => {
    const { container } = render(<LazyQR value="https://example.com" size={64} />)
    await waitFor(() => {
      const svg = container.querySelector('svg')
      expect(svg).not.toBeNull()
    }, { timeout: 3000 })
    // El fallback debería haber desaparecido
    expect(screen.queryByLabelText('Cargando código QR')).toBeNull()
  })
})
