import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: 'https://www.prodecaballito.com',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-AR',
  },
  projects: [
    // ── Existing tests (unchanged — auth run manually via CI or auth.setup.ts) ──
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: ['**/championship/**', '**/championship.setup.ts'] },
    { name: 'mobile',   use: { ...devices['Pixel 7'] },        testIgnore: ['**/championship/**', '**/championship.setup.ts'] },

    // ── Championship: authenticate test users ───────────────────────────────
    {
      name: 'championship-auth',
      testMatch: '**/championship.setup.ts',
      timeout: 90_000,
    },
    // ── Championship: full tournament simulation ────────────────────────────
    // globalSetup creates test data; globalTeardown cleans it up.
    // workers: 1 ensures specs run in lexicographic order (01-, 02-, …).
    // retries: 0 — suite is stateful; retrying would re-place bets or re-publish results.
    {
      name: 'championship',
      use: { ...devices['Desktop Chrome'] },
      testDir: './e2e/championship',
      globalSetup:    './e2e/championship/globalSetup.ts',
      globalTeardown: './e2e/championship/globalTeardown.ts',
      dependencies:   ['championship-auth'],
      timeout: 60_000,
      retries: 0,
    },
  ],
})
