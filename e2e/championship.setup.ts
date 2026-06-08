/**
 * Championship auth setup — creates test users via API (if needed) and
 * injects their JWT tokens directly into localStorage. No browser login.
 *
 * Runs serially (mode: serial) to avoid hammering the rate limiter with
 * 3 simultaneous login attempts from the same CI IP.
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'
import { E2E_RUN_TIMESTAMP } from './championship/helpers/timestamp'

// Run all 3 auth tests one at a time (not in parallel)
setup.describe.configure({ mode: 'serial' })

export const AUTH_ADMIN   = path.join(import.meta.dirname, '.auth/user.json')
export const AUTH_LIDER   = path.join(import.meta.dirname, '.auth/lider.json')
export const AUTH_RIVAL   = path.join(import.meta.dirname, '.auth/rival.json')
export const AUTH_VIRTUAL = path.join(import.meta.dirname, '.auth/virtual.json')

const API_BASE =
  process.env.API_BASE?.trim() ||
  'https://t49euho172.execute-api.us-east-1.amazonaws.com/prod/api'

const API_TIMEOUT = 10_000

const USERS = [
  {
    key:      'admin',
    email:    process.env.E2E_ADMIN_EMAIL?.trim()    || 'cfdelrio@gmail.com',
    password: process.env.E2E_ADMIN_PASSWORD?.trim() || 'carlitos',
    nombre:   'Admin',
    authFile: AUTH_ADMIN,
  },
  {
    key:      'lider',
    email:    process.env.E2E_LIDER_EMAIL?.trim()   || `cfdelrio.e2e.lider.${E2E_RUN_TIMESTAMP}@gmail.com`,
    password: process.env.E2E_LIDER_PASS?.trim()    || 'e2etest2026',
    nombre:   'E2E Lider',
    authFile: AUTH_LIDER,
  },
  {
    key:      'rival',
    email:    process.env.E2E_RIVAL_EMAIL?.trim()   || `cfdelrio.e2e.rival.${E2E_RUN_TIMESTAMP}@gmail.com`,
    password: process.env.E2E_RIVAL_PASS?.trim()    || 'e2etest2026',
    nombre:   'E2E Rival',
    authFile: AUTH_RIVAL,
  },
  {
    key:      'virtual',
    email:    process.env.E2E_VIRTUAL_EMAIL?.trim() || `cfdelrio.e2e.virtual.${E2E_RUN_TIMESTAMP}@gmail.com`,
    password: process.env.E2E_VIRTUAL_PASS?.trim()  || 'e2etest2026',
    nombre:   'E2E Virtual',
    authFile: AUTH_VIRTUAL,
  },
]

interface AuthData {
  token: string
  refreshToken: string
  user: Record<string, unknown>
}

interface LoginResult {
  data: AuthData | null
  error: string
  rateLimited: boolean
}

async function loginViaAPI(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(API_TIMEOUT),
    })
    const body = await res.json()
    if (body.success && body.data?.token) return { data: body.data, error: '', rateLimited: false }
    const rateLimited = res.status === 429 || Boolean(body.error?.includes('Demasiados'))
    return { data: null, error: body.error || JSON.stringify(body), rateLimited }
  } catch (e: any) {
    return { data: null, error: e.message, rateLimited: false }
  }
}

async function loginOrRegisterViaAPI(
  email: string,
  password: string,
  nombre: string,
): Promise<AuthData> {
  // Attempt 1: login
  const first = await loginViaAPI(email, password)
  if (first.data) return first.data
  console.log(`  Login failed for ${email}: ${first.error}`)

  if (first.rateLimited) {
    // Rate limited — wait 20s then retry login (don't attempt register, it'll also be blocked)
    console.log(`  Rate limited — waiting 20s...`)
    await new Promise(r => setTimeout(r, 20_000))
    const retry = await loginViaAPI(email, password)
    if (retry.data) return retry.data
    console.log(`  Login retry after 20s: ${retry.error}`)
  }

  // Not rate limited (or rate limit cleared) — try register
  try {
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nombre }),
      signal: AbortSignal.timeout(API_TIMEOUT),
    })
    const regData = await regRes.json()
    if (regData.success && regData.data?.token) {
      console.log(`  ✓ Registered new test user: ${email}`)
      return regData.data
    }
    console.log(`  Register failed: ${regData.error}`)

    // "already registered" means user exists — just login is failing
    if (regData.error?.includes('ya está registrado')) {
      console.log(`  User exists, retrying login in 5s...`)
      await new Promise(r => setTimeout(r, 5_000))
      const retry = await loginViaAPI(email, password)
      if (retry.data) return retry.data
      throw new Error(`User ${email} exists but login still fails: ${retry.error}`)
    }

    throw new Error(`Register error: ${regData.error}`)
  } catch (e: any) {
    throw new Error(`Could not authenticate ${email}: ${e.message}`)
  }
}

for (const user of USERS) {
  setup(`authenticate ${user.key}`, async ({ page }) => {
    // 1. Get auth data from API (login or register)
    const authData = await loginOrRegisterViaAPI(user.email, user.password, user.nombre)

    // 2. Navigate to the app domain so we can write to its localStorage
    await page.goto('/')

    // 3. Inject auth tokens directly into localStorage (same keys as authStore.ts)
    await page.evaluate((data) => {
      localStorage.setItem('token', data.token)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('user', JSON.stringify(data.user))
    }, authData)

    // 4. Verify auth works — navigate to /apuestas and confirm we're NOT redirected to /login
    await page.goto('/apuestas')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })

    // 5. Save storageState for use in championship specs
    await page.context().storageState({ path: user.authFile })

    // Delay between users to reduce rate limit pressure
    await new Promise(r => setTimeout(r, 2_000))
  })
}
