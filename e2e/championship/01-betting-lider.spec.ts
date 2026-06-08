/**
 * E2E: Lider places bets on all 4 championship matches via the browser UI.
 *
 * Logged in as: e2e.lider@prode.test
 * Planilla: "[E2E] Planilla Lider" (pagada)
 *
 * Uses a shared browser page across all tests — navigates to /apuestas once,
 * selects the planilla once, then places each bet without full page reloads.
 * This avoids repeated Lambda cold starts from multiple page.goto() calls.
 */
import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { BETS_LIDER, MATCHES, PLANILLA_NAMES } from './helpers/fixture'

const AUTH_FILE = path.join(import.meta.dirname, '../.auth/lider.json')

async function selectPlanilla(page: Page) {
  const select = page.locator('[data-tour="planilla-selector"] select')
  await select.waitFor({ state: 'attached', timeout: 15_000 })
  await select.selectOption({ label: PLANILLA_NAMES.lider })
}

async function placeBetInUI(
  page: Page,
  homeTeam: string,
  awayTeam: string,
  score: string,
) {
  const matchList = page.locator('[data-tour="match-list"]')
  const card = matchList
    .locator('.t-surface, [class*="rounded"]')
    .filter({ hasText: homeTeam })
    .filter({ hasText: awayTeam })
    .first()

  await card.waitFor({ timeout: 8_000 })

  const apostarBtn = card.getByRole('button', { name: /apostar|\+/i })
  await apostarBtn.click()

  const input = card.locator('input[placeholder="2-1"], input[type="text"]').first()
  await input.waitFor({ timeout: 5_000 })
  await input.fill(score)

  await card.getByRole('button', { name: /guardar/i }).click()
  await expect(card.getByText(score)).toBeVisible({ timeout: 8_000 })
}

test.describe.serial('Lider betting', () => {
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

  test('Lider ve los partidos del campeonato en /apuestas', async () => {
    await expect(sharedPage.getByText('Argentina')).toBeVisible()
    await expect(sharedPage.getByText('Brasil')).toBeVisible()
    await expect(sharedPage.getByText('Uruguay')).toBeVisible()
    await expect(sharedPage.getByText('Chile')).toBeVisible()
  })

  test('Lider apuesta mA: Argentina vs Brasil — 2-0', async () => {
    await placeBetInUI(sharedPage, MATCHES.mA.home, MATCHES.mA.away, BETS_LIDER.mA)
  })

  test('Lider apuesta mB: Uruguay vs Chile — 0-0', async () => {
    await placeBetInUI(sharedPage, MATCHES.mB.home, MATCHES.mB.away, BETS_LIDER.mB)
  })

  test('Lider apuesta mC: Argentina vs Uruguay — 3-1', async () => {
    await placeBetInUI(sharedPage, MATCHES.mC.home, MATCHES.mC.away, BETS_LIDER.mC)
  })

  test('Lider apuesta mD: Brasil vs Chile — 1-1', async () => {
    await placeBetInUI(sharedPage, MATCHES.mD.home, MATCHES.mD.away, BETS_LIDER.mD)
  })

  test('Lider ve el progreso actualizado después de apostar todos', async () => {
    const progress = sharedPage.getByText(/4.*completad|completad.*4/i)
    const isVisible = await progress.isVisible().catch(() => false)
    if (!isVisible) {
      const noPending = sharedPage.getByText(/al día|sin pendientes|todo completado/i)
      await expect(noPending.or(progress)).toBeVisible({ timeout: 5_000 })
    }
  })
})
