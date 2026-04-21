import { toast } from 'sonner'

interface BadgeData {
  slug: string
  name: string
  icon: string | null
  pointsValue?: number | null
}

export function showBadgeToast(badge: BadgeData) {
  toast.custom(
    () => (
      <div className="flex items-center gap-4 bg-background border border-green-500/40 rounded-2xl p-4 shadow-xl min-w-[280px]">
        <div className="text-5xl leading-none">{badge.icon ?? '🏅'}</div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-500 mb-0.5">
            Badge Unlocked! 🎉
          </p>
          <p className="text-base font-bold leading-tight">{badge.name}</p>
          {badge.pointsValue != null && badge.pointsValue > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              +{badge.pointsValue} points added to your account
            </p>
          )}
        </div>
      </div>
    ),
    { duration: 5000 },
  )
}
