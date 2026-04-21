'use client'

import { Sheet, SheetContent } from '@/components/ui/sheet'
import StationPanel from './StationPanel'
import type { Session } from 'next-auth'

interface StationDrawerProps {
  stationId: string | null
  onClose: () => void
  session: Session | null
}

export default function StationDrawer({ stationId, onClose, session }: StationDrawerProps) {
  return (
    <Sheet open={!!stationId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-xl">
        {stationId && (
          <StationPanel stationId={stationId} onClose={onClose} session={session} />
        )}
      </SheetContent>
    </Sheet>
  )
}
