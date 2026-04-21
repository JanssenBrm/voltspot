'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import AddStationModal from '@/components/stations/AddStationModal'

export default function NewStationPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/sign-in')
  }, [isLoaded, isSignedIn, router])

  return (
    <AddStationModal
      open
      onClose={() => router.push('/')}
      onAdded={() => router.push('/')}
    />
  )
}
