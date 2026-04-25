import Link from 'next/link'
import { CircleDollarSign, MapPin, Wallet, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PLUG_COLORS, PLUG_ICONS } from '@/lib/plugTypes'

interface StationCardProps {
  station: {
    id: string
    name: string
    city: string | null
    country: string | null
    isFree: boolean | null
    plugTypes: string[] | null
    claimedBy: string | null
  }
}

export default function StationCard({ station }: StationCardProps) {

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{station.name}</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {[station.city, station.country].filter(Boolean).join(', ') || 'Unknown location'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {station.isFree != null && (
          <Badge
            variant={station.isFree ? 'default' : 'secondary'}
            className={station.isFree
              ? 'h-7 rounded-full gap-1.5 px-3 text-xs font-medium border-transparent bg-emerald-600 text-white'
              : 'h-7 rounded-full gap-1.5 px-3 text-xs font-medium border border-border/70 bg-secondary text-secondary-foreground'}
          >
            {station.isFree ? <CircleDollarSign className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}
            {station.isFree ? 'Free to use' : 'Paid'}
          </Badge>
        )}
        {station.claimedBy && (
          <Badge
            variant="outline"
            className="h-7 rounded-full px-3 text-xs font-medium border-transparent bg-blue-600 text-white"
          >
            Claimed
          </Badge>
        )}
      </div>

      {station.plugTypes?.length ? (
        <div className="flex flex-wrap gap-1">
          {station.plugTypes.slice(0, 3).map((pt) => (
            <span key={pt} className={`text-xs px-1.5 py-0.5 rounded-full ${PLUG_COLORS[pt] ?? PLUG_COLORS.Other}`}>
              {PLUG_ICONS[pt] ?? '🔌'} {pt}
            </span>
          ))}
          {station.plugTypes.length > 3 && (
            <span className="text-xs text-muted-foreground">+{station.plugTypes.length - 3} more</span>
          )}
        </div>
      ) : null}

      <Button variant="outline" size="sm" className="w-full p-4" asChild>
        <Link href={`/stations/${station.id}`}>View Station</Link>
      </Button>
    </div>
  )
}
