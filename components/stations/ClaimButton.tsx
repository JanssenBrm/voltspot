'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ClaimButtonProps {
  stationId: string
  onClaimed: () => void
}

export default function ClaimButton({ stationId, onClaimed }: ClaimButtonProps) {
  const [loading, setLoading] = useState(false)
  const [claimed, setClaimed] = useState(false)

  const claim = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stations/${stationId}/claim`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to claim')

      setClaimed(true)
      onClaimed()
      toast.custom(() => (
        <div className="flex items-center gap-3 bg-background border rounded-xl p-4 shadow-lg">
          <span className="text-3xl">🏴</span>
          <div>
            <p className="font-bold text-sm">Station Claimed! 🎉</p>
            <p className="text-base font-semibold">Pioneer Badge Unlocked</p>
            <p className="text-xs text-muted-foreground">+100 points</p>
          </div>
        </div>
      ), { duration: 5000 })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (claimed) {
    return (
      <Button variant="outline" className="w-full p-4 text-green-600" disabled>
        <Flag className="h-4 w-4 mr-2" />
        You own this station!
      </Button>
    )
  }

  return (
    <Button variant="outline" className="w-full p-4" onClick={claim} disabled={loading}>
      <Flag className="h-4 w-4 mr-2" />
      {loading ? 'Claiming...' : 'Claim This Station'}
    </Button>
  )
}
