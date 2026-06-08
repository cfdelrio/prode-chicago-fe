/**
 * Championship fixture constants — bets, results and expected scoring.
 * These are the source of truth for all assertions in the championship specs.
 */

export type MatchKey = 'mA' | 'mB' | 'mC' | 'mD' | 'mCutoff'
export type PlayerKey = 'lider' | 'rival' | 'virtual'
export type PointColor = 'celeste' | 'rojo' | 'verde' | 'amarillo' | 'gris'

// ── Partido definitions ───────────────────────────────────────────────────────

export const MATCHES: Record<MatchKey, { home: string; away: string; jornada: number }> = {
  mA:      { home: 'Argentina', away: 'Brasil',   jornada: 1 },
  mB:      { home: 'Uruguay',   away: 'Chile',    jornada: 1 },
  mC:      { home: 'Argentina', away: 'Uruguay',  jornada: 2 },
  mD:      { home: 'Brasil',    away: 'Chile',    jornada: 2 },
  mCutoff: { home: 'E2E-Closed', away: 'E2E-Test', jornada: 99 }, // past cutoff
}

// ── Real results ──────────────────────────────────────────────────────────────

export const RESULTS: Record<Exclude<MatchKey, 'mCutoff'>, { local: number; visitante: number }> = {
  mA: { local: 2, visitante: 0 },  // 2 goles — sin bonus
  mB: { local: 0, visitante: 0 },  // 0 goles — sin bonus
  mC: { local: 3, visitante: 1 },  // 4 goles — CON BONUS
  mD: { local: 1, visitante: 1 },  // 2 goles — sin bonus
}

// ── Bets per player ───────────────────────────────────────────────────────────

export const BETS_LIDER:   Record<Exclude<MatchKey,'mCutoff'>, string> = {
  mA: '2-0',  // exacto → rojo (3pts)
  mB: '0-0',  // exacto → rojo (3pts)
  mC: '3-1',  // exacto + bonus (4 goles) → celeste (4pts)
  mD: '1-1',  // exacto → rojo (3pts)
}

export const BETS_RIVAL:   Record<Exclude<MatchKey,'mCutoff'>, string> = {
  mA: '1-0',  // ganador correcto, no exacto → amarillo (1pt)
  mB: '1-1',  // fallo total (empate ≠ 1-1) → gris (0pts)
  mC: '2-0',  // ganador correcto → amarillo (1pt)
  mD: '0-0',  // fallo total (empate) → gris (0pts)
}

export const BETS_VIRTUAL: Record<Exclude<MatchKey,'mCutoff'>, string> = {
  mA: '0-1',  // fallo total → gris
  mB: '2-1',  // fallo total → gris
  mC: '0-0',  // fallo total → gris
  mD: '2-0',  // fallo total → gris
}

// ── Expected scoring ──────────────────────────────────────────────────────────

export const SCORES_LIDER: Record<Exclude<MatchKey,'mCutoff'>, PointColor> = {
  mA: 'rojo',
  mB: 'rojo',
  mC: 'celeste',
  mD: 'rojo',
}

export const SCORES_RIVAL: Record<Exclude<MatchKey,'mCutoff'>, PointColor> = {
  mA: 'amarillo',
  mB: 'gris',
  mC: 'amarillo',
  mD: 'gris',
}

export const SCORES_VIRTUAL: Record<Exclude<MatchKey,'mCutoff'>, PointColor> = {
  mA: 'gris',
  mB: 'gris',
  mC: 'gris',
  mD: 'gris',
}

// ── Expected totals ───────────────────────────────────────────────────────────

export const TOTALS = {
  lider:   { pts: 13, exactos: 4, position: 1 },
  rival:   { pts: 2,  exactos: 0, position: 2 },
  virtual: { pts: 0,  exactos: 0, position: null }, // not paid
}

// ── Expected badges for Lider (after all results published) ──────────────────
export const BADGES_LIDER = ['primer_exacto', 'racha_3_exactos']

// ── CSS class patterns for each color (used in scoring assertions) ────────────

export const COLOR_CSS: Record<PointColor, RegExp> = {
  celeste:  /text-sky-500|bg-sky-50|sky/,
  rojo:     /text-red-500|bg-red-50|red/,
  verde:    /text-green-600|bg-green-50|green/,
  amarillo: /text-yellow-500|bg-yellow-50|yellow/,
  gris:     /text-gray-400|bg-gray-50|gray/,
}

// ── Player display names in UI ────────────────────────────────────────────────

export const PLANILLA_NAMES: Record<PlayerKey, string> = {
  lider:   '[E2E] Planilla Lider',
  rival:   '[E2E] Planilla Rival',
  virtual: '[E2E] Planilla Virtual',
}
