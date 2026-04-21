import { TopNav, BottomNav } from '@/components/Nav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="md:pt-14">{children}</main>
      <BottomNav />
    </div>
  )
}
