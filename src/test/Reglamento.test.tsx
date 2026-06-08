import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Reglamento } from '@/pages/Reglamento'

function renderReglamento() {
  return render(<MemoryRouter><Reglamento /></MemoryRouter>)
}

describe('Reglamento', () => {
  it('renderiza el título principal', () => {
    renderReglamento()
    expect(screen.getAllByText(/MUNDIAL/i).length).toBeGreaterThan(0)
  })

  it('muestra la sección de sistema de puntuación', () => {
    renderReglamento()
    expect(screen.getByText('Sistema de Puntuación')).toBeInTheDocument()
  })

  it('muestra la sección de ejemplos prácticos', () => {
    renderReglamento()
    expect(screen.getByText('Ejemplos Prácticos')).toBeInTheDocument()
  })

  it('muestra múltiples ejemplos numerados', () => {
    renderReglamento()
    expect(screen.getAllByText(/Ejemplo \d/i).length).toBeGreaterThan(0)
  })

  it('muestra el canal de WhatsApp al final de la página', () => {
    renderReglamento()
    const canal = screen.getByTestId('whatsapp-canal')
    expect(canal).toBeInTheDocument()
    // El canal debe ser el último elemento hijo del contenedor raíz
    const container = canal.parentElement!
    expect(container.lastElementChild).toBe(canal)
  })

  it('el canal de WhatsApp aparece después de Reglas Generales', () => {
    renderReglamento()
    const reglasTitle = screen.getByText('Reglas Generales')
    const canal = screen.getByTestId('whatsapp-canal')
    // Verificar orden en el DOM usando Node.DOCUMENT_POSITION_FOLLOWING
    const position = reglasTitle.compareDocumentPosition(canal)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('el QR apunta al canal correcto de WhatsApp', () => {
    renderReglamento()
    const enlace = screen.getByRole('link', { name: /Unirme al canal/i })
    expect(enlace).toHaveAttribute('href', 'https://whatsapp.com/channel/0029VbD5n7oDeON9vGA2gS3j')
  })
})
