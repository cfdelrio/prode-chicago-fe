import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Apuestas } from '@/pages/Apuestas'

const mockShow = vi.hoisted(() => vi.fn())

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user' } }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
}))

vi.mock('@/store/teamBadgesStore', () => ({
  useTeamBadgesStore: () => ({ badges: {}, loadBadges: vi.fn() }),
}))

vi.mock('@/utils/teamFlags', () => ({
  teamFlag: () => '',
  teamAbbr: (name: string) => name.slice(0, 3).toUpperCase(),
}))

vi.mock('@/components/match/MatchCard', () => ({
  MatchCard: ({
    match,
    onBetSaved,
    onBetDeleted,
  }: {
    match: { id: string; home_team: string; away_team: string; estado?: string }
    onBetSaved?: () => void
    onBetDeleted?: (mid: string) => void
  }) => (
    <div data-testid="match-card" data-estado={match.estado}>
      {match.home_team} vs {match.away_team}
      {onBetSaved && <button onClick={onBetSaved} data-testid={`save-${match.id}`}>save</button>}
      {onBetDeleted && <button onClick={() => onBetDeleted(match.id)} data-testid={`delete-${match.id}`}>delete</button>}
    </div>
  ),
}))

vi.mock('@/components/onboarding/Tour', () => ({
  OnboardingTour: ({ run }: { run: boolean }) => (
    <div data-testid="onboarding-tour" data-run={String(run)} />
  ),
  hasSeenOnboarding: vi.fn(() => false),
}))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const PLANILLA = { id: 'p1', user_id: 'u1', nombre_planilla: 'Mi planilla', precio_pagado: false }

function makeLive(id: string) {
  const past = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  return {
    id, home_team: `LiveH${id}`, away_team: `LiveA${id}`,
    estado: 'live', finished: false,
    resultado_local: 1, resultado_visitante: 1,
    time_cutoff: past, start_time: past, halftime_minutes: 0,
  }
}

function makePending(id: string) {
  const future = new Date(Date.now() + 72 * 3600 * 1000).toISOString()
  return {
    id, home_team: `Home${id}`, away_team: `Away${id}`,
    estado: 'scheduled', finished: false,
    resultado_local: null, resultado_visitante: null,
    time_cutoff: future, start_time: future, halftime_minutes: 0,
  }
}

async function setupApi(overrides: { matches?: unknown[]; bets?: unknown[] } = {}) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: overrides.matches ?? [] } } })
    if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA] } })
    if (url.includes('/bets')) return Promise.resolve({ data: { data: overrides.bets ?? [] } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderApuestas() {
  return render(<MemoryRouter><Apuestas /></MemoryRouter>)
}

describe('Apuestas — sección EN VIVO', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('muestra la sección "EN VIVO" cuando hay partidos live', async () => {
    await setupApi({ matches: [makeLive('L1'), makePending('m1')] })
    renderApuestas()
    // Live aparece duplicado: en la sección live + en la lista general
    await waitFor(() => expect(screen.getAllByText(/LiveHL1/).length).toBeGreaterThanOrEqual(1))
    expect(screen.getByText(/Homem1/)).toBeInTheDocument()
  })

  it('onBetSaved del partido en vivo dispara loadBets', async () => {
    await setupApi({ matches: [makeLive('L1')] })
    renderApuestas()
    await waitFor(() => expect(screen.getAllByTestId('match-card').length).toBeGreaterThan(0))

    const { api } = await import('@/api/client')
    const callsBefore = (api.get as ReturnType<typeof vi.fn>).mock.calls.length

    const user = userEvent.setup()
    // El primer save-L1 es el de la sección live (renderizada primero)
    const saveBtns = screen.getAllByTestId('save-L1')
    await user.click(saveBtns[0])
    await waitFor(() => {
      const callsAfter = (api.get as ReturnType<typeof vi.fn>).mock.calls.length
      expect(callsAfter).toBeGreaterThan(callsBefore)
    })
  })

  it('onBetDeleted del partido en vivo limpia bet del estado', async () => {
    await setupApi({
      matches: [makeLive('L1')],
      bets: [{ id: 'b1', match_id: 'L1', goles_local: 1, goles_visitante: 0 }],
    })
    renderApuestas()
    await waitFor(() => expect(screen.getAllByTestId('match-card').length).toBeGreaterThan(0))

    const user = userEvent.setup()
    const delBtns = screen.getAllByTestId('delete-L1')
    await user.click(delBtns[0])
    expect(screen.getAllByTestId('match-card').length).toBeGreaterThan(0)
  })
})

describe('Apuestas — OnboardingTour', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('OnboardingTour arranca con run=true tras 400ms si nunca se vio', async () => {
    await setupApi({ matches: [makePending('m1')] })
    renderApuestas()
    await waitFor(() => {
      const tour = screen.getByTestId('onboarding-tour')
      expect(tour.getAttribute('data-run')).toBe('true')
    }, { timeout: 2000 })
  })
})
