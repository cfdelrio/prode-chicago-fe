/**
 * Thin API client for E2E setup/teardown — no browser needed.
 * Uses fetch directly against the REST API.
 */

const API_BASE =
  process.env.API_BASE?.trim() ||
  'https://t49euho172.execute-api.us-east-1.amazonaws.com/prod/api'

export class ApiClient {
  constructor(public token: string) {}

  static async login(email: string, password: string): Promise<ApiClient> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15_000),
    })
    const data = await res.json()
    // Auth responses are wrapped: { success, data: { token, user, refreshToken } }
    const token = data.data?.token ?? data.token
    if (!data.success || !token) {
      throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`)
    }
    return new ApiClient(token)
  }

  static async loginOrRegister(
    email: string,
    password: string,
    nombre: string,
  ): Promise<{ client: ApiClient; userId: string }> {
    // Try login first; if it fails, register then login
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15_000),
    })
    const loginData = await loginRes.json()
    const loginToken = loginData.data?.token ?? loginData.token
    const loginUserId = loginData.data?.user?.id
    if (loginData.success && loginToken && loginUserId) {
      return {
        client: new ApiClient(loginToken),
        userId: loginUserId,
      }
    }
    // Register
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nombre }),
      signal: AbortSignal.timeout(15_000),
    })
    const regData = await regRes.json()
    if (!regData.success) {
      throw new Error(`Register failed for ${email}: ${JSON.stringify(regData)}`)
    }
    // Login after register to get a fresh token
    const client = await ApiClient.login(email, password)
    const loginAfterRegRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const loginAfterRegData = await loginAfterRegRes.json()
    const userId = loginAfterRegData.data?.user?.id
    if (!userId) {
      throw new Error(`Could not extract userId after register for ${email}`)
    }
    return { client, userId }
  }

  private async req(method: string, path: string, body?: object): Promise<any> {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    })
    const data = await res.json()
    return data
  }

  get(path: string)                       { return this.req('GET', path) }
  post(path: string, body: object)        { return this.req('POST', path, body) }
  put(path: string, body: object)         { return this.req('PUT', path, body) }
  delete(path: string)                    { return this.req('DELETE', path) }
}

// ── Business helpers ──────────────────────────────────────────────────────────

export async function createTournament(
  api: ApiClient,
  name: string,
): Promise<string> {
  const now = new Date()
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const data = await api.post('/tournaments', {
    name,
    fase: 'Grupos',
    start_date: now.toISOString().split('T')[0],
    end_date:   end.toISOString().split('T')[0],
  })
  if (!data.success || !data.data?.id) {
    throw new Error(`createTournament failed: ${JSON.stringify(data)}`)
  }
  return data.data.id
}

export async function createMatch(
  api: ApiClient,
  opts: {
    home_team: string
    away_team: string
    tournament_id: string
    jornada?: number
  },
): Promise<string> {
  // start_time in 2h, cutoff in 90min — allows users to bet during tests
  const now       = Date.now()
  const startTime = new Date(now + 2 * 60 * 60 * 1000).toISOString()
  const cutOff    = new Date(now + 90 * 60 * 1000).toISOString()
  const data = await api.post('/matches', {
    home_team:       opts.home_team,
    away_team:       opts.away_team,
    start_time:      startTime,
    time_cutoff:     cutOff,
    halftime_minutes: 45,
    tournament_id:   opts.tournament_id,
    jornada:         opts.jornada ?? 1,
  })
  if (!data.success || !data.data?.id) {
    throw new Error(`createMatch failed: ${JSON.stringify(data)}`)
  }
  return data.data.id
}

export async function createMatchPastCutoff(
  api: ApiClient,
  opts: { home_team: string; away_team: string },
): Promise<string> {
  // cutoff already passed — used for testing cutoff enforcement.
  // Intentionally NOT associated with a tournament so it doesn't interfere with lock validation.
  const now       = Date.now()
  const startTime = new Date(now - 30 * 60 * 1000).toISOString()
  const cutOff    = new Date(now - 35 * 60 * 1000).toISOString()
  const data = await api.post('/matches', {
    home_team:       opts.home_team,
    away_team:       opts.away_team,
    start_time:      startTime,
    time_cutoff:     cutOff,
    halftime_minutes: 45,
  })
  if (!data.success || !data.data?.id) {
    throw new Error(`createMatchPastCutoff failed: ${JSON.stringify(data)}`)
  }
  return data.data.id
}

export async function createPlanilla(api: ApiClient): Promise<string> {
  const data = await api.post('/planillas', {})
  if (!data.success || !data.data?.id) {
    throw new Error(`createPlanilla failed: ${JSON.stringify(data)}`)
  }
  return data.data.id
}

export async function renamePlanilla(
  api: ApiClient,
  planillaId: string,
  nombre: string,
): Promise<void> {
  await api.put(`/planillas/${planillaId}`, { nombre_planilla: nombre })
}

export async function lockPlanilla(api: ApiClient, planillaId: string): Promise<void> {
  // Locks a planilla (sets precio_pagado=true). Requires all match bets to be placed.
  const data = await api.put(`/planillas/${planillaId}/lock`, {})
  if (!data.success) {
    throw new Error(`lockPlanilla failed for ${planillaId}: ${JSON.stringify(data)}`)
  }
}

export async function placeBet(
  api: ApiClient,
  planillaId: string,
  matchId: string,
  score: string, // e.g. "2-1"
): Promise<void> {
  const data = await api.post('/bets/score', {
    planilla_id: planillaId,
    match_id:    matchId,
    score,
  })
  if (!data.success) {
    throw new Error(`placeBet failed (${score} for match ${matchId}): ${JSON.stringify(data)}`)
  }
}

export async function publishResult(
  api: ApiClient,
  matchId: string,
  local: number,
  visitante: number,
): Promise<void> {
  const data = await api.post(`/matches/${matchId}/result`, {
    resultado_local:     local,
    resultado_visitante: visitante,
  })
  if (!data.success) {
    throw new Error(`publishResult failed (match ${matchId}): ${JSON.stringify(data)}`)
  }
}

export async function deletePlanilla(api: ApiClient, planillaId: string): Promise<void> {
  await api.delete(`/planillas/${planillaId}`)
}

export async function deleteMatch(api: ApiClient, matchId: string): Promise<void> {
  await api.delete(`/matches/${matchId}`)
}

export async function deactivateTournament(api: ApiClient, tournamentId: string): Promise<void> {
  await api.put(`/tournaments/${tournamentId}`, { is_active: false })
}
