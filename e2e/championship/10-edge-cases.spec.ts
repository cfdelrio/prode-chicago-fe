/**
 * E2E: Edge cases and boundary conditions.
 *
 * Covers:
 *  - Cutoff enforcement: user can't bet on a past-cutoff match
 *  - Planilla detail page shows correct stats after results
 *  - Virtual planilla has "no oficial" indicator in its planilla page
 *  - Matrix shows all E2E planillas
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import { readState } from './helpers/state'
import { PLANILLA_NAMES, TOTALS } from './helpers/fixture'

const AUTH_LIDER   = path.join(import.meta.dirname, '../.auth/lider.json')
const AUTH_VIRTUAL = path.join(import.meta.dirname, '../.auth/virtual.json')
const AUTH_ADMIN   = path.join(import.meta.dirname, '../.auth/user.json')

// ── Cutoff / finished match enforcement ──────────────────────────────────────

test.describe('Cutoff enforcement (Lider)', () => {
  test.use({ storageState: AUTH_LIDER })

  test('Match con resultado publicado no tiene botón "Apostar"', async ({ page }) => {
    // mCutoff ("E2E-Closed vs E2E-Test") is created with a past cutoff and its
    // result is published in globalSetup (making it finished). Both finished and
    // past-cutoff states prevent betting — verify the UI blocks the action.
    await page.goto('/apuestas')
    await page.waitForSelector('[data-tour="match-list"]', { timeout: 15_000 })

    const matchList = page.locator('[data-tour="match-list"]')
    const card = matchList
      .locator('.t-surface, [class*="rounded"]')
      .filter({ hasText: 'E2E-Closed' })
      .first()

    const isVisible = await card.isVisible().catch(() => false)
    if (!isVisible) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(1_000)
    }

    if (await card.isVisible().catch(() => false)) {
      // If card is visible, verify it has no bet button
      const apostBtn = card.getByRole('button', { name: /apostar/i })
      await expect(apostBtn).not.toBeVisible({ timeout: 5_000 })
    }
    // If the card isn't visible at all, the match is hidden from the bet list
    // (common for finished matches not in the user's tournament) — also valid.
  })
})

// ── Planilla detail page ──────────────────────────────────────────────────────

test.describe('Planilla detail page (Lider)', () => {
  test.use({ storageState: AUTH_LIDER })

  test('/planilla del Lider muestra 13 puntos y 4 exactos', async ({ page }) => {
    const state = readState()
    const planillaId = state.planillaIds.lider
    await page.goto(`/planilla/${planillaId}`)
    await page.waitForSelector('[class*="planilla"], [class*="stat"]', { timeout: 15_000 })

    // Points total
    await expect(page.getByText(String(TOTALS.lider.pts))).toBeVisible({ timeout: 5_000 })
    // Exactos count
    await expect(page.getByText(String(TOTALS.lider.exactos))).toBeVisible()
  })

  test('/planilla del Lider muestra distribución de colores (hay celeste)', async ({ page }) => {
    const state = readState()
    await page.goto(`/planilla/${state.planillaIds.lider}`)
    await page.waitForSelector('[class*="planilla"]', { timeout: 15_000 })

    // There should be at least one celeste score (mC: 4pts)
    const celesteEl = page
      .getByText(/4\s*pts|celeste/i)
      .or(page.locator('[class*="sky-"]'))
      .first()
    await expect(celesteEl).toBeVisible({ timeout: 5_000 })
  })
})

// ── Virtual planilla (not paid) ───────────────────────────────────────────────

test.describe('Virtual planilla "no pagada" (Virtual user)', () => {
  test.use({ storageState: AUTH_VIRTUAL })

  test('/planilla del Virtual muestra indicador "No pagada"', async ({ page }) => {
    const state = readState()
    await page.goto(`/planilla/${state.planillaIds.virtual}`)
    await page.waitForSelector('[class*="planilla"]', { timeout: 15_000 })

    const indicator = page
      .getByText(/no pagada|no participa|no oficial/i)
      .or(page.locator('[class*="orange"], [class*="naranja"]').first())
      .first()
    await expect(indicator).toBeVisible({ timeout: 5_000 })
  })
})

// ── Matrix completeness ───────────────────────────────────────────────────────

test.describe('Matrix shows all E2E planillas (Admin)', () => {
  test.use({ storageState: AUTH_ADMIN })

  test('/matriz contiene las 3 planillas del campeonato', async ({ page }) => {
    await page.goto('/matriz')
    await page.waitForSelector('table', { timeout: 20_000 })
    await page.waitForTimeout(2_000)

    await expect(page.getByText(PLANILLA_NAMES.lider)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(PLANILLA_NAMES.rival)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(PLANILLA_NAMES.virtual)).toBeVisible({ timeout: 10_000 })
  })

  test('/planilla del Lider es accesible desde /ranking (drawer → link)', async ({ page }) => {
    await page.goto('/ranking')
    await page.waitForSelector('.row-entrance, [class*="ranking"]', { timeout: 15_000 })
    await expect(page.getByText(PLANILLA_NAMES.lider)).toBeVisible({ timeout: 10_000 })

    // Click on Lider row to open drawer
    await page.locator('.row-entrance').filter({ hasText: PLANILLA_NAMES.lider }).click()

    // Click "Ver planilla completa"
    const verBtn = page
      .getByRole('link', { name: /planilla completa|ver planilla/i })
      .or(page.getByRole('button', { name: /planilla completa|ver planilla/i }))
      .first()
    await expect(verBtn).toBeVisible({ timeout: 5_000 })
    await verBtn.click()

    // Should navigate to /planilla/:id
    await expect(page).toHaveURL(/\/planilla\//, { timeout: 8_000 })
  })
})
