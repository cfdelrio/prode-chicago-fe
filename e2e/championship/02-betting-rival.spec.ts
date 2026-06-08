/**
 * E2E: Rival places bets on all 4 championship matches via the browser UI.
 *
 * Logged in as: e2e.rival@prode.test
 * Rival bets differently from Lider — designed to produce lower scoring.
 *
 * Uses a shared browser page across all tests — navigates to /apuestas once.
 */
import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { BETS_RIVAL, MATCHES, PLANILLA_NAMES } from './helpers/fixture'

const AUTH_FILE = path.join(import.meta.dirname, '../.auth/rival.json')

async function selectPlanilla(page: Page) {
  const select = page.locator('[data-tour="planilla-selector"] select')
  await select.waitFor({ state: 'attached', timeout: 15_000 })
  await select.selectOption({ label: PLANILLA_NAMES.rival })
}

async function placeBetInUI(page: Page, homeTeam: string, awayTeam: string, score: string) {
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

test.describe.serial('Rival betting', () => {
  let sharedPage: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE })
    sharedPage = await context.newPage()
    await sharedPage.goto('/apuestas')
    await expect(sharedPage).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await sharedPage.waitForSelector('[data-tour="planilla-selector"]', { timeout: 30_000 })
    await selectPlanilla(sharedPage)
  })

  test.afterAll(async () => {
    await sharedPage.context().close()
  })

  test('Rival apuesta mA: Argentina vs Brasil — 1-0', async () => {
    await placeBetInUI(sharedPage, MATCHES.mA.home, MATCHES.mA.away, BETS_RIVAL.mA)
  })

  test('Rival apuesta mB: Uruguay vs Chile — 1-1', async () => {
    await placeBetInUI(sharedPage, MATCHES.mB.home, MATCHES.mB.away, BETS_RIVAL.mB)
  })

  test('Rival apuesta mC: Argentina vs Uruguay — 2-0', async () => {
    await placeBetInUI(sharedPage, MATCHES.mC.home, MATCHES.mC.away, BETS_RIVAL.mC)
  })

  test('Rival apuesta mD: Brasil vs Chile — 0-0', async () => {
    await placeBetInUI(sharedPage, MATCHES.mD.home, MATCHES.mD.away, BETS_RIVAL.mD)
  })
})
