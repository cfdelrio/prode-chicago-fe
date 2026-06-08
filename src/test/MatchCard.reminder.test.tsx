import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MatchCard } from '@/components/match/MatchCard'
import type { Match, Bet } from '@/types'

const mockShow = vi.hoisted(() => vi.fn())

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { id: 'u1', idioma_pref: 'es' } }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/teamBadgesStore', () => ({
  useTeamBadgesStore: () => ({}),
  getTeamBadge: () => null,
}))

vi.mock('@/utils/teamFlags', () => ({
  teamFlag: () => '',
  teamAbbr: (name: string) => name.slice(0, 3).toUpperCase(),
}))

vi.mock('@/api/client', () => ({
  api: { post: vi.fn(), delete: vi.fn() },
}))

const NOW = new Date('2026-06-14T12:00:00Z').getTime()
const FUTURE_CUTOFF = new Date(NOW + 8 * 3600 * 1000).toISOString()

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    home_team: 'Argentina',
    away_team: 'Brasil',
    start_time: '2026-06-14T20:00:00Z',
    time_cutoff: FUTURE_CUTOFF,
    estado: 'scheduled',
    resultado_local: undefined,
    resultado_visitante: undefined,
    grupo: 'A',
    jornada: 1,
    halftime_minutes: 45,
    ...overrides,
  } as unknown as Match
}

function makeBet(overrides: Partial<Bet> = {}): Bet {
  return {
    id: 'b1',
    planilla_id: 'p1',
    match_id: 'm1',
    goles_local: 2,
    goles_visitante: 1,
    ...overrides,
  } as Bet
}

describe('MatchCard — recordatorio en modo edición', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checkbox de recordatorio aparece al entrar en modo edición', async () => {
    const user = userEvent.setup()
    render(<MatchCard match={makeMatch()} planillaId="p1" now={NOW} />)
    await user.click(screen.getByText(/completar resultado/i))
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('checkbox de recordatorio viene marcado por defecto al crear apuesta', async () => {
    const user = userEvent.setup()
    render(<MatchCard match={makeMatch()} planillaId="p1" now={NOW} />)
    await user.click(screen.getByText(/completar resultado/i))
    const checkbox = screen.getByRole('checkbox')
    expect((checkbox as HTMLInputElement).checked).toBe(true)
  })

  it('desmarcando el checkbox oculta el select de minutos', async () => {
    const user = userEvent.setup()
    render(<MatchCard match={makeMatch()} planillaId="p1" now={NOW} />)
    await user.click(screen.getByText(/completar resultado/i))
    const checkbox = screen.getByRole('checkbox')
    // El select de minutos está visible cuando reminderEnabled=true
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    await user.click(checkbox)
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('el select de minutos tiene las 5 opciones de tiempo', async () => {
    const user = userEvent.setup()
    render(<MatchCard match={makeMatch()} planillaId="p1" now={NOW} />)
    await user.click(screen.getByText(/completar resultado/i))
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    const options = Array.from(screen.getByRole('combobox').querySelectorAll('option'))
    expect(options.length).toBe(5)
    // Values: 5, 10, 15, 30, 60
    const values = options.map(o => o.getAttribute('value'))
    expect(values).toContain('5')
    expect(values).toContain('60')
  })

  it('cambiar el select de minutos actualiza la selección', async () => {
    const user = userEvent.setup()
    render(<MatchCard match={makeMatch()} planillaId="p1" now={NOW} />)
    await user.click(screen.getByText(/completar resultado/i))
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    await user.selectOptions(screen.getByRole('combobox'), '60')
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('60')
  })

  it('save incluye remind_before_minutes cuando recordatorio está activo', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { data: makeBet() } })

    render(<MatchCard match={makeMatch()} planillaId="p1" now={NOW} />)
    await user.click(screen.getByText(/completar resultado/i))
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    await user.selectOptions(screen.getByRole('combobox'), '10')
    const input = screen.getByRole('textbox')
    await user.type(input, '2-0')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/bets/score', expect.objectContaining({
        remind_before_minutes: 10,
      }))
    })
  })

  it('save sin recordatorio envía null en remind_before_minutes', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { data: makeBet() } })

    render(<MatchCard match={makeMatch()} planillaId="p1" now={NOW} />)
    await user.click(screen.getByText(/completar resultado/i))
    // Desmarcar el checkbox
    await user.click(screen.getByRole('checkbox'))
    const input = screen.getByRole('textbox')
    await user.type(input, '1-1')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/bets/score', expect.objectContaining({
        remind_before_minutes: null,
      }))
    })
  })

  it('editar apuesta existente con remind_minutes guardado → se restaura en el select', async () => {
    const user = userEvent.setup()
    const futureSched = new Date(NOW + 2 * 3600 * 1000).toISOString()
    const bet = makeBet({ remind_minutes: 15, scheduled_for: futureSched })
    render(<MatchCard match={makeMatch()} bet={bet} planillaId="p1" now={NOW} />)
    await user.click(screen.getByText('Editar'))
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('15')
  })

  it('editar apuesta sin remind_minutes previo → select default a 30', async () => {
    const user = userEvent.setup()
    const bet = makeBet()
    render(<MatchCard match={makeMatch()} bet={bet} planillaId="p1" now={NOW} />)
    await user.click(screen.getByText('Editar'))
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('30')
  })

  it('cancel en modo edición oculta checkbox y select', async () => {
    const user = userEvent.setup()
    render(<MatchCard match={makeMatch()} planillaId="p1" now={NOW} />)
    await user.click(screen.getByText(/completar resultado/i))
    await waitFor(() => expect(screen.getByRole('checkbox')).toBeInTheDocument())
    await user.click(screen.getByText(/cancelar/i))
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
  })
})

describe('MatchCard — bonus display', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resultado exacto con 4+ goles → muestra chip bonus', () => {
    const match = makeMatch({
      estado: 'finished',
      resultado_local: 3,
      resultado_visitante: 2,
      time_cutoff: '2026-06-14T07:00:00Z',
    })
    // Sin apuesta → pointResult es null → podría mostrar bonus chip si has bet
    // Necesitamos bet con exacto y 5 goles
    const bet = makeBet({ goles_local: 3, goles_visitante: 2 })
    render(<MatchCard match={match} bet={bet} planillaId="p1" now={NOW} />)
    // 3+2=5 goles → bonus → 4pts celeste
    expect(screen.getByText(/4pts/)).toBeInTheDocument()
  })

  it('sin planillaId y partido terminado sin bonus → no muestra chip bonus', () => {
    const match = makeMatch({
      estado: 'finished',
      resultado_local: 1,
      resultado_visitante: 0,
      time_cutoff: '2026-06-14T07:00:00Z',
    })
    const bet = makeBet({ goles_local: 1, goles_visitante: 0 }) // exacto, 1 gol total → no bonus
    render(<MatchCard match={match} bet={bet} now={NOW} />)
    // 1+0=1 gol → sin bonus → no muestra "Bonus"
    expect(screen.queryByText(/Bonus/)).toBeNull()
  })
})
