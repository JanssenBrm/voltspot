import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PointsBadgeProps {
  points: number
  className?: string
}

export default function PointsBadge({ points, className }: PointsBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-green-500/10 text-green-500 font-semibold px-2.5 py-0.5 text-sm', className)}>
      <Zap className="h-3.5 w-3.5" />
      {points.toLocaleString()}
    </span>
  )
}
