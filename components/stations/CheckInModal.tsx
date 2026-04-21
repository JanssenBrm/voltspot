'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import type { Session } from 'next-auth'
import Link from 'next/link'

interface CheckInModalProps {
  open: boolean
  onClose: () => void
  stationId: string
  session: Session | null
}

export default function CheckInModal({ open, onClose, stationId, session }: CheckInModalProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [statusReported, setStatusReported] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stations/${stationId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: rating || undefined, comment: comment || undefined, statusReported: statusReported || undefined }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Failed')

      toast.success('Check-in submitted! ⚡')

      if (data.newBadges?.length) {
        for (const badge of data.newBadges) {
          toast.custom(() => (
            <div className="flex items-center gap-3 bg-background border rounded-xl p-4 shadow-lg">
              <span className="text-3xl">{badge.icon}</span>
              <div>
                <p className="font-bold text-sm">Badge Unlocked! 🎉</p>
                <p className="text-base font-semibold">{badge.name}</p>
                <p className="text-xs text-muted-foreground">+{badge.pointsValue} points</p>
              </div>
            </div>
          ), { duration: 5000 })
        }
      }

      if (data.anonymous) {
        toast.info('Create an account to earn points and badges for this check-in!', {
          action: { label: 'Sign Up', onClick: () => window.location.href = '/signup' },
        })
      }

      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to submit check-in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check In ⚡</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(n)}
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${n <= (hoverRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={statusReported} onValueChange={(v) => setStatusReported(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="How is it working?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="working">✅ Working</SelectItem>
                <SelectItem value="broken">⚠️ Broken</SelectItem>
                <SelectItem value="offline">❌ Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {session?.user && (
            <div className="space-y-1">
              <Label>Comment (optional)</Label>
              <Textarea
                placeholder="Share your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {!session?.user && (
            <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
              <Link href="/signup" className="text-green-500 font-medium hover:underline">Create an account</Link>{' '}
              to leave a comment and earn points for your check-in.
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={submit} disabled={loading} className="flex-1">
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
