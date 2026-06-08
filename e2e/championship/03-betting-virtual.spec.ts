/**
 * E2E: Virtual user places bets (planilla NOT paid — for testing unpaid behavior).
 *
 * Logged in as: e2e.virtual@prode.test
 * All bets are wrong by design (0pts expected across the board).
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import { BETS_VIRTUAL, MATCHES, PLANILLA_NAMES } from './helpers/fixture'

const AUTH_FILE = path.join(import.meta.dirname, '../.auth/virtual.json')
test.use({ storageState: AUTH_FILE })

async function selectPlanilla(page: any) {
  const select = page.locator('[data-tour="planilla-selector"] select')
  await select.waitFor({ state: 'attached', timeout: 15_000 })
  await select.selectOption({ label: PLANILLA_NAMES.virtual })
}

async function placeBetInUI(page: any, homeTeam: string, awayTeam: string, score: string) {
  const matchList = page.locator('[data-tour="match-list"]')
  const card = matchList
    .locator('.t-surface, [class*="rounded"]')
    .filter({ hasText: homeTeam })
    .filter({ hasText: awayTeam })
    .first()
  await card.waitFor({ timeout: 8_000 })
  await card.getByRole('button', { name: /apostar|\+/i }).click()
  const input = card.locator('input[placeholder="2-1"], input[type="text"]').first()
  await input.waitFor({ timeout: 5_000 })
  await input.fill(score)
  await card.getByRole('button', { name: /guardar/i }).click()
  await expect(card.getByText(score)).toBeVisible({ timeout: 8_000 })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/apuestas')
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
  await page.waitForSelector('[data-tour="planilla-selector"]', { timeout: 30_000 })
  await selectPlanilla(page)
})

test('Virtual puede apostar aunque su planilla no esté pagada', async ({ page }) => {
  await placeBetInUI(page, MATCHES.mA.home, MATCHES.mA.away, BETS_VIRTUAL.mA)
  await placeBetInUI(page, MATCHES.mB.home, MATCHES.mB.away, BETS_VIRTUAL.mB)
  await placeBetInUI(page, MATCHES.mC.home, MATCHES.mC.away, BETS_VIRTUAL.mC)
  await placeBetInUI(page, MATCHES.mD.home, MATCHES.mD.away, BETS_VIRTUAL.mD)
})
