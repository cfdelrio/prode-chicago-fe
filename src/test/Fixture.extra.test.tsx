import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Fixture } from '@/pages/Fixture'
import { useAuthStore } from '@/store/authStore'

const FIXTURE_T = {
  title: 'Fixture Mundial', download: 'Descargar', share: 'Compartir',
  copied: '¡Copiado!', shareText: 'Mirá el fixture', subtitle: 'Copa del Mundo 2026',
  worldCup: 'Copa del Mundo', path: 'El camino de', group: 'Grupo', viewPath: 'Ver camino',
  worldCupStart: 'Inicio', startDate: '11 Jun', finalLabel: 'Final', finalDate: '19 Jul',
  venues: 'Sedes', venuesValue: '16', teams: 'Equipos', teamsValue: '48',
  historyTitle: 'Historia', historyStars: '⭐⭐⭐', historyYears: '1930 · 1978 · 1986',
  viewHistory: 'Ver historial', bannerTitle: 'Mundial 2026', bannerSubtitle: 'Arrancá tu PRODE',
  modalHistoryTitle: 'Historia Argentina', modalClose: 'Cerrar', records: [],
}

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((sel?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Test', idioma_pref: 'es', rol: 'user' } }
    return sel ? sel(store) : store
  }),
}))

vi.mock('@/hooks/useT', () => ({
  useT: () => ({ fixture: FIXTURE_T }),
}))

function renderFixture() {
  return render(<MemoryRouter><Fixture /></MemoryRouter>)
}

describe('Fixture — handleShare', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('usa clipboard cuando navigator.share no está disponible', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText }, configurable: true, writable: true,
    })
    Object.defineProperty(navigator, 'share', {
      value: undefined, configurable: true, writable: true,
    })

    renderFixture()
    await user.click(screen.getByRole('button', { name: /compartir/i }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(FIXTURE_T.shareText)
    })
    expect(screen.getByRole('button', { name: /copiado/i })).toBeInTheDocument()
  })

  it('usa navigator.share cuando está disponible', async () => {
    const user = userEvent.setup()
    const shareFn = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', {
      value: shareFn, configurable: true, writable: true,
    })

    renderFixture()
    await user.click(screen.getByRole('button', { name: /compartir/i }))

    await waitFor(() => {
      expect(shareFn).toHaveBeenCalledWith(
        expect.objectContaining({ text: FIXTURE_T.shareText })
      )
    })
    expect(screen.queryByRole('button', { name: /copiado/i })).not.toBeInTheDocument()
  })
})

describe('Fixture — handleViewPath', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('click en "Ver camino" hace scrollIntoView del grupo de Argentina', async () => {
    const user = userEvent.setup()
    const scrollIntoView = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView

    renderFixture()
    await user.click(screen.getByRole('button', { name: /ver camino/i }))

    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth', block: 'center' })
    )
  })
})

describe('Fixture — modal de historial', () => {
  beforeEach(() => vi.clearAllMocks())

  it('modal oculto por defecto', () => {
    renderFixture()
    expect(screen.queryByText('Historia Argentina')).not.toBeInTheDocument()
  })

  it('click en "Ver historial" abre el modal con campeonatos', async () => {
    const user = userEvent.setup()
    renderFixture()

    await user.click(screen.getByRole('button', { name: /ver historial/i }))

    await waitFor(() => {
      expect(screen.getByText('Historia Argentina')).toBeInTheDocument()
    })
    // Los años de los campeones aparecen en el modal (puede haber coincidencia fuera del modal)
    expect(screen.getAllByText(/1978/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/1986/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/2022/).length).toBeGreaterThan(0)
  })

  it('click en "Cerrar" cierra el modal', async () => {
    const user = userEvent.setup()
    renderFixture()

    await user.click(screen.getByRole('button', { name: /ver historial/i }))
    await waitFor(() => expect(screen.getByText('Historia Argentina')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByText('Historia Argentina')).not.toBeInTheDocument()
  })

  it('click en el backdrop cierra el modal', async () => {
    const user = userEvent.setup()
    renderFixture()

    await user.click(screen.getByRole('button', { name: /ver historial/i }))
    await waitFor(() => expect(screen.getByText('Historia Argentina')).toBeInTheDocument())

    const backdrop = document.querySelector('.fixed.inset-0')!
    fireEvent.click(backdrop)
    expect(screen.queryByText('Historia Argentina')).not.toBeInTheDocument()
  })
})

describe('Fixture — idioma portugués (Brasil)', () => {
  afterEach(() => {
    vi.mocked(useAuthStore).mockImplementation((sel?: (s: any) => any) => {
      const store = { user: { id: 'u1', nombre: 'Test', idioma_pref: 'es', rol: 'user' } }
      return sel ? sel(store) : store
    })
  })

  it('muestra BRASIL como equipo destacado cuando idioma es pt', () => {
    vi.mocked(useAuthStore).mockImplementationOnce((sel?: (s: any) => any) => {
      const store = { user: { id: 'u1', nombre: 'Test', idioma_pref: 'pt', rol: 'user' } }
      return sel ? sel(store) : store
    })
    renderFixture()
    expect(screen.getByText('BRASIL')).toBeInTheDocument()
  })

  it('muestra nombres en pt cuando idioma es pt', () => {
    vi.mocked(useAuthStore).mockImplementationOnce((sel?: (s: any) => any) => {
      const store = { user: { id: 'u1', nombre: 'Test', idioma_pref: 'pt', rol: 'user' } }
      return sel ? sel(store) : store
    })
    renderFixture()
    // En pt, "Países Bajos" → "Países Baixos"
    expect(screen.getByText('Países Baixos')).toBeInTheDocument()
  })
})

describe('Fixture — información del torneo', () => {
  it('muestra datos del torneo (fechas, sedes, equipos)', () => {
    renderFixture()
    expect(screen.getByText('11 Jun')).toBeInTheDocument()
    expect(screen.getByText('19 Jul')).toBeInTheDocument()
    expect(screen.getByText('16')).toBeInTheDocument()
    expect(screen.getByText('48')).toBeInTheDocument()
  })

  it('muestra todos los grupos (A-L)', () => {
    renderFixture()
    // Grupo J aparece dos veces (grilla + sidebar featured), usamos getAllByText
    ;['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].forEach(id => {
      expect(screen.getAllByText(`Grupo ${id}`).length).toBeGreaterThan(0)
    })
  })

  it('muestra slots PLAY-OFF sin bandera (FIFA placeholder)', () => {
    renderFixture()
    expect(screen.getAllByText('FIFA').length).toBeGreaterThan(0)
  })

  it('marca Argentina con texto en negrita (isStar)', () => {
    renderFixture()
    // Argentina está en grupo J como isStar — tiene clase font-bold
    const argEl = screen.getByText('Argentina')
    expect(argEl).toHaveClass('font-bold')
  })
})
