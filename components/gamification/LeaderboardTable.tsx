import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Trophy } from 'lucide-react'

interface LeaderboardEntry {
  rank: number
  points: number
  userId: string
  userName: string | null
  userAvatar: string | null
}

export default function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  if (!entries.length) {
    return <p className="text-center text-muted-foreground py-8">No data yet. Be the first! ⚡</p>
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.userId}
          className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
            entry.rank === 1 ? 'bg-yellow-500/10 border border-yellow-500/30' :
            entry.rank === 2 ? 'bg-gray-400/10 border border-gray-400/20' :
            entry.rank === 3 ? 'bg-orange-600/10 border border-orange-600/20' :
            'bg-muted/40'
          }`}
        >
          <div className="w-8 text-center font-bold text-sm">
            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
          </div>
          <Avatar className="h-8 w-8">
            <AvatarImage src={entry.userAvatar ?? ''} />
            <AvatarFallback className="text-xs">{entry.userName?.[0] ?? '?'}</AvatarFallback>
          </Avatar>
          <span className="flex-1 font-medium text-sm truncate">{entry.userName ?? 'Anonymous'}</span>
          <div className="flex items-center gap-1 text-green-500 font-bold text-sm">
            <Trophy className="h-3.5 w-3.5" />
            {entry.points}
          </div>
        </div>
      ))}
    </div>
  )
}
