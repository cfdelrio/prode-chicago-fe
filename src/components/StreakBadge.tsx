interface Props {
  streak: number
  size?: 'sm' | 'md'
}

export function StreakBadge({ streak, size = 'sm' }: Props) {
  if (streak < 3) return null

  const fire = streak >= 10 ? '👑' : streak >= 5 ? '🔥🔥' : '🔥'
  const sizeClass = size === 'md' ? 'text-sm px-2 py-0.5' : 'text-xs px-1.5 py-0.5'

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${sizeClass} rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-bold`}
      title={`Racha de ${streak} exactos consecutivos`}
    >
      {fire}{streak}
    </span>
  )
}
