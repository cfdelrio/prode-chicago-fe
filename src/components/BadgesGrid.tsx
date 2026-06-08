import { BADGE_LABELS } from '@/types'
import type { UserBadge } from '@/types'

interface Props {
  badges: UserBadge[]
}

export function BadgesGrid({ badges }: Props) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <div className="text-4xl mb-2">🏅</div>
        <div className="text-sm">Todavía no desbloqueaste logros.</div>
        <div className="text-xs mt-1 opacity-70">Acertá un exacto para empezar.</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {badges.map(badge => {
        const meta = BADGE_LABELS[badge.badge_type] ?? {
          emoji: '🏅',
          label: badge.badge_type,
          description: '',
        }
        const date = new Date(badge.awarded_at).toLocaleDateString('es-AR', {
          day: '2-digit', month: 'short',
        })
        return (
          <div
            key={badge.badge_type}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow border border-gray-200 dark:border-gray-700 text-center"
            title={meta.description}
          >
            <div className="text-3xl mb-1">{meta.emoji}</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{meta.label}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{date}</div>
          </div>
        )
      })}
    </div>
  )
}
