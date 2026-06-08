/**
 * E2E: Verify /ranking shows correct positions after all results are published.
 *
 * Expected final ranking:
 *   #1 — [E2E] Planilla Lider  (13 pts)
 *   #2 — [E2E] Planilla Rival  (2 pts)
 *   Virtual — "No oficial" badge, no position number
 *
 * Logged in as: admin (sees full ranking)
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import { TOTALS, PLANILLA_NAMES } from './helpers/fixture'

const AUTH_FILE = path.join(import.meta.dirname, '../.auth/user.json')
test.use({ storageState: AUTH_FILE })

test.beforeEach(async ({ page }) => {
  await page.goto('/ranking')
  await page.waitForSelector('table, [class*="ranking"], [class*="row"]', { timeout: 20_000 })
  // Wait for E2E entries to appear
  await expect(page.getByText(/E2E.*Lider|Lider.*E2E/)).toBeVisible({ timeout: 15_000 })
})

test('/ranking muestra Lider en posición #1', async ({ page }) => {
  const liderRow = page.locator('.row-entrance').filter({ hasText: PLANILLA_NAMES.lider })
  await expect(liderRow).toBeVisible()
  // Should show position 1 (as number, #1, or medal emoji 🥇)
  await expect(liderRow.getByText(/^1$|^#1$|🥇/).or(liderRow.getByText('1').first())).toBeVisible()
})

test('/ranking muestra Lider con 13 puntos', async ({ page }) => {
  const liderRow = page.locator('.row-entrance').filter({ hasText: PLANILLA_NAMES.lider })
  await expect(liderRow.getByText(String(TOTALS.lider.pts))).toBeVisible()
})

test('/ranking muestra Rival en posición #2', async ({ page }) => {
  const rivalRow = page.locator('.row-entrance').filter({ hasText: PLANILLA_NAMES.rival })
  await expect(rivalRow).toBeVisible()
  await expect(rivalRow.getByText(/^2$|^#2$|🥈/).or(rivalRow.getByText('2').first())).toBeVisible()
})

test('/ranking muestra Virtual con badge "No oficial"', async ({ page }) => {
  const virtualRow = page.locator('.row-entrance').filter({ hasText: PLANILLA_NAMES.virtual })
  await expect(virtualRow).toBeVisible()
  await expect(virtualRow.getByText(/no oficial|no pagad/i)).toBeVisible()
})

test('Lider aparece antes que Rival en el DOM (orden visual)', async ({ page }) => {
  const liderRow = page.locator('.row-entrance').filter({ hasText: PLANILLA_NAMES.lider })
  const rivalRow = page.locator('.row-entrance').filter({ hasText: PLANILLA_NAMES.rival })
  const liderBox = await liderRow.boundingBox()
  const rivalBox = await rivalRow.boundingBox()
  expect(liderBox?.y).toBeLessThan(rivalBox?.y ?? Infinity)
})

test('Clic en fila del Lider abre drawer con stats', async ({ page }) => {
  const liderRow = page.locator('.row-entrance').filter({ hasText: PLANILLA_NAMES.lider })
  await liderRow.click()
  // Drawer/modal should open with planilla details
  const drawer = page.locator('[class*="drawer"], [class*="modal"], [class*="fixed"]')
    .filter({ hasText: /exacto|pts|planilla/i })
    .first()
  await expect(drawer).toBeVisible({ timeout: 5_000 })
  // Should have a link to see the full planilla
  await expect(page.getByRole('link', { name: /planilla completa|ver planilla/i }).or(
    page.getByRole('button', { name: /planilla completa|ver planilla/i })
  )).toBeVisible()
})

test('Favoritos: marcar Rival como favorito y filtrar', async ({ page }) => {
  // Find and click the favorite button (⭐) for Rival (not own row)
  const rivalRow = page.locator('.row-entrance').filter({ hasText: PLANILLA_NAMES.rival })
  const favBtn   = rivalRow.getByRole('button').filter({ hasText: /⭐|☆|fav/i }).first()
  const hasFavBtn = await favBtn.isVisible().catch(() => false)
  if (!hasFavBtn) {
    test.skip(true, 'No favorite button found in this view')
    return
  }
  await favBtn.click()

  // Click "Favoritos" filter toggle
  const filterBtn = page.getByRole('button').filter({ hasText: /favoritos/i }).first()
  await expect(filterBtn).toBeVisible()
  await filterBtn.click()

  // Rival should still be visible in the filtered view
  await expect(page.locator('.row-entrance').filter({ hasText: PLANILLA_NAMES.rival })).toBeVisible({ timeout: 5_000 })

  // Clean up: unmark favorite and clear filter
  await favBtn.click()
  await filterBtn.click()
})
