import { TopNav, BottomNav } from '@/components/Nav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="md:pt-14 pb-16 md:pb-0">{children}</main>
      <BottomNav />
      <footer className="hidden md:block text-center text-xs text-muted-foreground py-2 border-t">
        Station data partially sourced from{' '}
        <a href="https://openchargemap.org" target="_blank" rel="noopener noreferrer" className="underline">
          Open Charge Map (openchargemap.org)
        </a>
      </footer>
    </div>
  )
}
