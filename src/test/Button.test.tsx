import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('renderiza con variant primary y size md por defecto', () => {
    render(<Button>Click</Button>)
    const btn = screen.getByRole('button', { name: 'Click' })
    expect(btn.className).toContain('bg-[#0042A5]')
    expect(btn.className).toContain('py-2.5')
    expect(btn.className).toContain('rounded-xl')
  })

  it('aplica variant dark', () => {
    render(<Button variant="dark">Dark</Button>)
    expect(screen.getByRole('button').className).toContain('bg-[#001A4B]')
  })

  it('aplica variant danger', () => {
    render(<Button variant="danger">Borrar</Button>)
    expect(screen.getByRole('button').className).toContain('bg-red-600')
  })

  it('aplica variant secondary', () => {
    render(<Button variant="secondary">x</Button>)
    expect(screen.getByRole('button').className).toContain('bg-gray-100')
  })

  it('aplica variant ghost', () => {
    render(<Button variant="ghost">x</Button>)
    expect(screen.getByRole('button').className).toContain('bg-transparent')
  })

  it('size sm reduce padding y tamaño', () => {
    render(<Button size="sm">x</Button>)
    expect(screen.getByRole('button').className).toContain('text-xs')
    expect(screen.getByRole('button').className).toContain('rounded-lg')
  })

  it('size lg aumenta padding', () => {
    render(<Button size="lg">x</Button>)
    expect(screen.getByRole('button').className).toContain('py-3')
  })

  it('fullWidth agrega w-full', () => {
    render(<Button fullWidth>x</Button>)
    expect(screen.getByRole('button').className).toContain('w-full')
  })

  it('fullWidth=false omite w-full', () => {
    render(<Button>x</Button>)
    expect(screen.getByRole('button').className).not.toContain('w-full')
  })

  it('loading=true muestra spinner y deshabilita', () => {
    const { container } = render(<Button loading>Guardar</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
    // El Spinner es un div con animate-spin
    expect(container.querySelector('.animate-spin')).not.toBeNull()
  })

  it('disabled lo deshabilita', () => {
    render(<Button disabled>x</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('dispara onClick cuando no está disabled ni loading', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>x</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('NO dispara onClick cuando loading=true', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick} loading>x</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('type por defecto es button (no submit)', () => {
    render(<Button>x</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('respeta type=submit cuando se pasa', () => {
    render(<Button type="submit">Enviar</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('concatena className adicional', () => {
    render(<Button className="mt-4">x</Button>)
    expect(screen.getByRole('button').className).toContain('mt-4')
  })

  it('pasa attributes extra como aria-label', () => {
    render(<Button aria-label="cerrar">×</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'cerrar')
  })
})
