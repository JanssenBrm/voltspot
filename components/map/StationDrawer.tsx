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
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="h-[78vh] p-0 rounded-t-3xl border-x border-t border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90"
      >
        {stationId && (
          <StationPanel stationId={stationId} onClose={onClose} userId={userId} />
        )}
      </SheetContent>
    </Sheet>
  )
}
