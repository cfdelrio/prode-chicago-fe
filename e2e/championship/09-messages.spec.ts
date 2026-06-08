/**
 * E2E: Messages interface via /messages.
 *
 * Note: /messages is admin-only (RequireAdmin guard in App.tsx).
 * Regular users (Lider, Rival) are redirected to / on access.
 * These tests verify the admin-facing messaging UI works correctly.
 */
import { test, expect } from '@playwright/test'
import path from 'path'

const AUTH_ADMIN = path.join(import.meta.dirname, '../.auth/user.json')

const TEST_MESSAGE = `[E2E] Test mensaje — ${Date.now()}`

test.describe('Admin messaging interface', () => {
  test.use({ storageState: AUTH_ADMIN })

  test('Admin puede navegar a /messages y ver la interfaz de mensajes', async ({ page }) => {
    await page.goto('/messages')
    await page.waitForURL('/messages', { timeout: 10_000 })
    await expect(page.getByText('Mensajes')).toBeVisible({ timeout: 10_000 })
  })

  test('Admin puede enviar un mensaje en una conversación existente', async ({ page }) => {
    await page.goto('/messages')
    await page.waitForURL('/messages', { timeout: 10_000 })

    // Find first available conversation
    const firstConv = page.locator('a[href^="/messages/"]').first()
    const hasConv = await firstConv.isVisible().catch(() => false)
    if (!hasConv) {
      test.skip(true, 'No hay conversaciones disponibles en entorno de test')
      return
    }

    await firstConv.click()

    // Type and send message
    const input = page.locator('input[placeholder]').last()
    await input.waitFor({ timeout: 8_000 })
    await input.fill(TEST_MESSAGE)
    await page.getByRole('button', { name: /enviar|send/i }).click()

    // Message should appear in chat
    await expect(page.getByText(TEST_MESSAGE)).toBeVisible({ timeout: 8_000 })
  })
})
