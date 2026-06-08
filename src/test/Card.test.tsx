import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Card } from '@/components/ui/Card'

describe('Card', () => {
  it('renderiza con clases base y padding md por defecto', () => {
    const { container } = render(<Card>contenido</Card>)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('bg-white')
    expect(div.className).toContain('rounded-xl')
    expect(div.className).toContain('border')
    expect(div.className).toContain('shadow-sm')
    expect(div.className).toContain('p-4')
  })

  it('padding none no agrega clase p-*', () => {
    const { container } = render(<Card padding="none">x</Card>)
    const div = container.firstChild as HTMLElement
    expect(div.className).not.toMatch(/\bp-\d/)
  })

  it('padding sm aplica p-3', () => {
    const { container } = render(<Card padding="sm">x</Card>)
    expect((container.firstChild as HTMLElement).className).toContain('p-3')
  })

  it('padding lg aplica p-5', () => {
    const { container } = render(<Card padding="lg">x</Card>)
    expect((container.firstChild as HTMLElement).className).toContain('p-5')
  })

  it('concatena className adicional', () => {
    const { container } = render(<Card className="my-2">x</Card>)
    expect((container.firstChild as HTMLElement).className).toContain('my-2')
  })

  it('renderiza children', () => {
    const { getByText } = render(<Card><span>hijo</span></Card>)
    expect(getByText('hijo')).toBeInTheDocument()
  })

  it('pasa atributos HTML extra como data-testid', () => {
    const { container } = render(<Card data-testid="card-x">x</Card>)
    expect(container.querySelector('[data-testid="card-x"]')).not.toBeNull()
  })
})
