/**
 * E2E: Admin publishes match results via API, then verifies the UI reflects them.
 *
 * Logged in as: admin (cfdelrio@gmail.com)
 * Results are published via API (fast + reliable).
 * UI assertions verify what the user sees AFTER results are published.
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import { ApiClient, publishResult } from './helpers/api'
import { readState } from './helpers/state'
import { RESULTS, MATCHES } from './helpers/fixture'

const AUTH_FILE = path.join(import.meta.dirname, '../.auth/user.json')
test.use({ storageState: AUTH_FILE })

const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL?.trim()    || 'cfdelrio@gmail.com'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD?.trim() || 'carlitos'

// Publish all 4 results before browser assertions — in parallel (independent operations)
test.beforeAll(async () => {
  const state = readState()
  const admin = await ApiClient.login(ADMIN_EMAIL, ADMIN_PASSWORD)
  await Promise.all(
    Object.entries(RESULTS)
      .filter(([key]) => state.matchIds[key])
      .map(([key, result]) => publishResult(admin, state.matchIds[key], result.local, result.visitante))
  )
})

test('Partido mA aparece como "finalizado" en /apuestas después del resultado', async ({ page }) => {
  await page.goto('/apuestas')
  await page.waitForSelector('[data-tour="match-list"]', { timeout: 15_000 })

  const matchList = page.locator('[data-tour="match-list"]')
  const card = matchList
    .locator('.t-surface, [class*="rounded"]')
    .filter({ hasText: MATCHES.mA.home })
    .filter({ hasText: MATCHES.mA.away })
    .first()

  // The result (2-0) should be visible in the card
  await expect(card.getByText('2')).toBeVisible({ timeout: 8_000 })
  await expect(card.getByText('0')).toBeVisible()

  // The "Apostar" button should NO longer be visible (match is finished)
  await expect(card.getByRole('button', { name: /apostar/i })).not.toBeVisible()
})

test('Partido mC aparece con resultado 3-1 en /apuestas', async ({ page }) => {
  await page.goto('/apuestas')
  await page.waitForSelector('[data-tour="match-list"]', { timeout: 15_000 })

  const matchList = page.locator('[data-tour="match-list"]')
  const card = matchList
    .locator('.t-surface, [class*="rounded"]')
    .filter({ hasText: MATCHES.mC.home })
    .filter({ hasText: MATCHES.mC.away })
    .first()

  await expect(card.getByText('3')).toBeVisible({ timeout: 8_000 })
  await expect(card.getByText('1')).toBeVisible()
})

test('/ranking muestra datos después de publicar resultados', async ({ page }) => {
  await page.goto('/ranking')
  // Ranking should load and show [E2E] entries
  await page.waitForSelector('table, [class*="ranking"]', { timeout: 15_000 })
  await expect(page.getByText(/E2E.*Lider|Lider.*E2E/)).toBeVisible({ timeout: 10_000 })
})
