'use client'

import { useState } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export default function AccountPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [name, setName] = useState(user?.fullName ?? '')
  const [loading, setLoading] = useState(false)

  if (!isLoaded) return null

  if (!isSignedIn) {
    router.push('/sign-in')
    return null
  }

  const saveProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      {/* Profile */}
      <section className="space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.imageUrl ?? ''} />
            <AvatarFallback className="text-xl">{user.firstName?.[0] ?? '?'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Display Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className='p-5'/>
        </div>
        <Button onClick={saveProfile} disabled={loading} className="p-5">
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </section>

      <Separator />

      {/* Sign out */}
      <section className="space-y-2">
        <h2 className="font-semibold">Session</h2>
        <Button variant="outline" className="p-5" onClick={() => signOut({ redirectUrl: '/' })}>
          Sign Out
        </Button>
      </section>

      <Separator />

      {/* Danger zone */}
      <section className="space-y-2">
        <h2 className="font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">Once deleted, your account cannot be recovered.</p>
        <Button
          variant="destructive"
          className="p-4"
          onClick={() => {
            if (confirm('Are you sure? This cannot be undone.')) {
              fetch('/api/account', { method: 'DELETE' }).then(() => signOut({ redirectUrl: '/' }))
            }
          }}
        >
          Delete Account
        </Button>
      </section>
    </div>
  )
}
