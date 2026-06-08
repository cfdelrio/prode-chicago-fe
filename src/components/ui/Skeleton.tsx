/** Primitive skeleton block — animate-pulse gray rectangle */
export function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

/** Circular avatar skeleton */
export function SkAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' }[size]
  return <div className={`animate-pulse bg-gray-200 rounded-full shrink-0 ${s}`} />
}

/** Full MatchCard skeleton — mimics 3-column body + footer */
export function SkMatchCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* tournament header strip */}
      <div className="bg-gray-100 h-6" />
      {/* body: local | VS | away */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-4 py-4">
        <div className="flex flex-col items-center gap-1.5">
          <Sk className="w-10 h-10 rounded-full" />
          <Sk className="h-2.5 w-16" />
        </div>
        <div className="flex flex-col items-center justify-center gap-1.5 px-2">
          <Sk className="h-6 w-10 rounded-lg" />
          <Sk className="h-2.5 w-14" />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Sk className="w-10 h-10 rounded-full" />
          <Sk className="h-2.5 w-16" />
        </div>
      </div>
      {/* footer */}
      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <Sk className="h-5 w-20 rounded-full" />
        <Sk className="h-7 w-16 rounded-lg" />
      </div>
    </div>
  )
}

/** Conversation row skeleton — matches Messages sidebar item */
export function SkConversation() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
      <SkAvatar size="sm" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Sk className="h-3 w-24" />
          <Sk className="h-2 w-8" />
        </div>
        <Sk className="h-2.5 w-32" />
      </div>
    </div>
  )
}

/** Matriz row skeleton — sticky left cell + N data cells */
export function SkMatrizRow({ cols = 8 }: { cols?: number }) {
  return (
    <div className="flex items-center border-b border-gray-50">
      <div className="flex items-center gap-2 px-2 py-2 min-w-[140px] sm:min-w-[180px] shrink-0">
        <SkAvatar size="sm" />
        <Sk className="h-3 w-20" />
      </div>
      <Sk className="h-4 w-6 mx-auto" />
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="min-w-[60px] flex justify-center py-2">
          <Sk className="h-5 w-7 rounded" />
        </div>
      ))}
    </div>
  )
}

/** Ranking table row skeleton — matches grid-cols-[2rem_1fr_auto_auto_2rem] */
export function SkRankRow() {
  return (
    <div className="grid grid-cols-[2rem_1fr_auto_auto_2rem] gap-2 items-center px-4 py-3 border-b border-gray-50">
      <Sk className="h-4 w-4" />
      <div className="flex items-center gap-2.5">
        <SkAvatar size="sm" />
        <div className="space-y-1.5 min-w-0">
          <Sk className="h-3 w-24" />
          <Sk className="h-2.5 w-16" />
        </div>
      </div>
      <Sk className="h-3 w-5" />
      <Sk className="h-4 w-7" />
      <Sk className="h-4 w-4 rounded-full" />
    </div>
  )
}

/** Compact match row skeleton — matches MatchRow in Tournaments */
export function SkTournamentMatchRow() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-2 justify-end">
          <Sk className="h-3 w-20" />
          <Sk className="h-5 w-5 rounded-full" />
        </div>
        <div className="flex flex-col items-center gap-1 px-2 min-w-[64px]">
          <Sk className="h-4 w-12" />
          <Sk className="h-2 w-10" />
        </div>
        <div className="flex items-center gap-2">
          <Sk className="h-5 w-5 rounded-full" />
          <Sk className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

/** Tournament ranking row skeleton — matches grid-cols-[2rem_1fr_auto_auto_auto] */
export function SkTournamentRankRow() {
  return (
    <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-2 items-center px-4 py-3 border-b border-gray-50">
      <Sk className="h-4 w-5 rounded" />
      <div className="flex items-center gap-2">
        <SkAvatar size="sm" />
        <div className="space-y-1 min-w-0">
          <Sk className="h-3 w-28 rounded" />
          <Sk className="h-2.5 w-16 rounded" />
        </div>
      </div>
      <Sk className="h-3 w-5 rounded hidden sm:block" />
      <Sk className="h-3 w-5 rounded hidden sm:block" />
      <Sk className="h-4 w-8 rounded" />
    </div>
  )
}
