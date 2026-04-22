'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser, useClerk, SignInButton } from '@clerk/nextjs'
import { Map, User, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { href: '/', label: 'Map', icon: Map },
  { href: '/account', label: 'Account', icon: User },
]

export function TopNav() {
  const pathname = usePathname()
  const { user, isSignedIn } = useUser()

  return (
    <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 items-center border-b bg-background/95 backdrop-blur px-4 gap-6">
      <Link href="/" className="flex items-center gap-2 font-bold text-lg">
        <Zap className="h-5 w-5 text-primary" />
        VoltSpot
      </Link>

      <nav className="flex items-center gap-1 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        {isSignedIn ? (
          <Link href="/account" className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.imageUrl ?? ''} />
              <AvatarFallback>{user?.firstName?.[0] ?? 'U'}</AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <>
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full border border-border/70 p-4 hover:border-border hover:bg-accent/70"
              >
                Sign In
              </Button>
            </SignInButton>
            <Button size="sm" className="rounded-full p-4 shadow-md hover:shadow-lg" asChild>
              <Link href="/sign-up">Sign Up</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const { isSignedIn } = useUser()

  const items = isSignedIn
    ? NAV_ITEMS
    : [...NAV_ITEMS.slice(0, 1), { href: '/sign-in', label: 'Sign In', icon: User }]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t bg-background/95 backdrop-blur">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
