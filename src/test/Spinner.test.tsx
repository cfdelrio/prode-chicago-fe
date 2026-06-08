import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Spinner, PageSpinner } from '@/components/ui/Spinner'

describe('Spinner', () => {
  it('renderiza con tamaño md por defecto', () => {
    const { container } = render(<Spinner />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('w-8')
    expect(div.className).toContain('h-8')
    expect(div.className).toContain('animate-spin')
  })

  it('renderiza con tamaño sm', () => {
    const { container } = render(<Spinner size="sm" />)
    expect((container.firstChild as HTMLElement).className).toContain('w-4')
  })

  it('renderiza con tamaño lg', () => {
    const { container } = render(<Spinner size="lg" />)
    expect((container.firstChild as HTMLElement).className).toContain('w-12')
  })
})

describe('PageSpinner', () => {
  it('renderiza un Spinner grande centrado a pantalla completa', () => {
    const { container } = render(<PageSpinner />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('min-h-screen')
    const inner = wrapper.firstChild as HTMLElement
    expect(inner.className).toContain('w-12')
  })
})
