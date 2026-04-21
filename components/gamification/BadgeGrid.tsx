import { Lock } from 'lucide-react'

interface BadgeItem {
  slug: string
  name: string
  description: string | null
  icon: string | null
  pointsValue: number | null
}

interface BadgeGridProps {
  badges: BadgeItem[]
  earnedSlugs: Set<string>
  earnedDates?: Record<string, string>
}

export default function BadgeGrid({ badges, earnedSlugs, earnedDates = {} }: BadgeGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {badges.map((badge) => {
        const earned = earnedSlugs.has(badge.slug)
        return (
          <div
            key={badge.slug}
            className={`rounded-xl border p-4 text-center space-y-2 transition-all ${
              earned
                ? 'bg-card border-green-500/30 shadow-sm'
                : 'bg-muted/30 border-border/50 opacity-60 grayscale'
            }`}
          >
            <div className="text-4xl relative">
              {badge.icon ?? '🏅'}
              {!earned && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-background/80 rounded-full p-1">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">{badge.name}</p>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
            </div>
            <p className="text-xs font-medium text-green-500">+{badge.pointsValue} pts</p>
            {earned && earnedDates[badge.slug] && (
              <p className="text-xs text-muted-foreground/60">
                {new Date(earnedDates[badge.slug]).toLocaleDateString()}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
