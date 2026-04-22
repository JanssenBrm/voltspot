'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type ChangeRequest = {
  id: string
  stationId: string | null
  requestType: 'create' | 'edit' | 'delete'
  status: string
  payload: Record<string, unknown> | null
  createdAt: string
  stationName: string | null
}

export default function ModerationQueue() {
  const [items, setItems] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/station-change-requests')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load requests')
      setItems(data)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const review = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id)
    try {
      const res = await fetch(`/api/station-change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to review request')
      setItems((prev) => prev.filter((item) => item.id !== id))
      toast.success(action === 'approve' ? 'Request approved' : 'Request rejected')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to review request')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Station change requests</h1>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading requests...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending requests.</p>
      ) : (
        items.map((item) => (
          <Card key={item.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{item.stationName ?? 'New station request'}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              <Badge variant="outline">{item.requestType}</Badge>
            </div>
            {item.payload && (
              <pre className="text-xs rounded-md border bg-muted/30 p-2 overflow-x-auto">
                {JSON.stringify(item.payload, null, 2)}
              </pre>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => review(item.id, 'approve')}
                disabled={processing === item.id}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => review(item.id, 'reject')}
                disabled={processing === item.id}
              >
                Reject
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
