'use client'

import { Sheet, SheetContent } from '@/components/ui/sheet'
import StationPanel from './StationPanel'

interface StationDrawerProps {
  stationId: string | null
  onClose: () => void
  userId: string | null
}

export default function StationDrawer({ stationId, onClose, userId }: StationDrawerProps) {
  return (
    <Sheet open={!!stationId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-xl">
        {stationId && (
          <StationPanel stationId={stationId} onClose={onClose} userId={userId} />
        )}
      </SheetContent>
    </Sheet>
  )
}
