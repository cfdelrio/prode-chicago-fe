/**
 * Championship globalTeardown — deletes all test data created by globalSetup.
 *
 * Deletion order respects FK constraints:
 *   matches (cascades bets + scores) → planillas → deactivate tournament
 *
 * Test users (lider, rival, virtual) are NOT deleted because there is no
 * DELETE /users endpoint. Their data is fully cleaned via planilla deletion.
 * On subsequent runs, globalSetup reuses them via login.
 */
import { ApiClient, deleteMatch, deletePlanilla, deactivateTournament } from './helpers/api'
import { readState, deleteState } from './helpers/state'

const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL?.trim()    || 'cfdelrio@gmail.com'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD?.trim() || 'carlitos'

async function globalTeardown() {
  if (process.env.E2E_SKIP_TEARDOWN === 'true') {
    console.log('\n⚠️  E2E_SKIP_TEARDOWN=true — skipping cleanup (data left in DB for inspection)')
    return
  }
  console.log('\n🧹 Championship globalTeardown starting...')

  let state
  try {
    state = readState()
  } catch {
    console.log('  ⚠ No state file found — nothing to clean up')
    return
  }

  const admin = await ApiClient.login(ADMIN_EMAIL, ADMIN_PASSWORD)

  // 1. Delete all matches (cascades bets, scores, bet_reminders)
  for (const [key, matchId] of Object.entries(state.matchIds)) {
    try {
      await deleteMatch(admin, matchId)
      console.log(`  ✓ Deleted match ${key}`)
    } catch (e) {
      console.warn(`  ⚠ Could not delete match ${key}: ${e}`)
    }
  }

  // 2. Delete planillas (cascades ranking rows)
  for (const [key, planillaId] of Object.entries(state.planillaIds)) {
    try {
      await deletePlanilla(admin, planillaId)
      console.log(`  ✓ Deleted planilla ${key}`)
    } catch (e) {
      console.warn(`  ⚠ Could not delete planilla ${key}: ${e}`)
    }
  }

  // 3. Deactivate tournament (soft delete — no cascade needed)
  try {
    await deactivateTournament(admin, state.tournamentId)
    console.log(`  ✓ Tournament deactivated`)
  } catch (e) {
    console.warn(`  ⚠ Could not deactivate tournament: ${e}`)
  }

  // 4. Remove state file
  deleteState()
  console.log('  ✓ State file removed')
  console.log('🧹 Championship globalTeardown complete!\n')
}

export default globalTeardown
