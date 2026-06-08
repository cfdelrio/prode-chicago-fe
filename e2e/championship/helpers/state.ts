/**
 * Shared state between championship specs.
 * Written by globalSetup, read by all specs and globalTeardown.
 * Stored at e2e/.champ-state.json (gitignored).
 */
import fs   from 'fs'
import path from 'path'

// ── Auth file readers (Playwright storageState → JWT) ────────────────────────

export function readAuthState(authFile: string): { token: string; userId: string } {
  const raw     = JSON.parse(fs.readFileSync(authFile, 'utf-8'))
  const ls      = raw.origins?.[0]?.localStorage ?? []
  const token   = ls.find((i: any) => i.name === 'token')?.value
  const userStr = ls.find((i: any) => i.name === 'user')?.value
  const userId  = userStr ? JSON.parse(userStr).id : undefined
  if (!token || !userId) throw new Error(`No auth data in ${authFile}`)
  return { token, userId }
}

export function readToken(authFile: string): string {
  return readAuthState(authFile).token
}

export interface ChampState {
  tournamentId:  string
  matchIds:      Record<string, string>  // mA, mB, mC, mD, mCutoff → UUID
  planillaIds:   Record<string, string>  // lider, rival, virtual → UUID
  userIds:       Record<string, string>  // lider, rival, virtual → UUID
}

const STATE_FILE = path.join(import.meta.dirname, '../../.champ-state.json')

export function readState(): ChampState {
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error(`Championship state file not found at ${STATE_FILE}. Run globalSetup first.`)
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
}

export function writeState(partial: Partial<ChampState>): void {
  const current = fs.existsSync(STATE_FILE)
    ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
    : {}
  const merged = { ...current, ...partial }
  fs.writeFileSync(STATE_FILE, JSON.stringify(merged, null, 2))
}

export function deleteState(): void {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE)
  }
}
