'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import AddStationModal from '@/components/stations/AddStationModal'

export default function NewStationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/signin')
  }, [status, router])

  return (
    <AddStationModal
      open
      onClose={() => router.push('/')}
      onAdded={() => router.push('/')}
    />
  )
}
