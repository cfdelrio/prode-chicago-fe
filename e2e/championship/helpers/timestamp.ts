/**
 * Shared timestamp for E2E test users across auth setup and globalSetup.
 * Ensures both championship.setup.ts and globalSetup.ts use the same
 * timestamped emails, avoiding collisions with leftover test accounts.
 */

// Use environment variable if set (e.g. from CI), otherwise current timestamp
export const E2E_RUN_TIMESTAMP =
  process.env.E2E_RUN_TIMESTAMP?.trim() || String(Date.now())
