export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <span className="text-green-500">⚡</span>
            VoltSpot
          </div>
          <p className="text-sm text-muted-foreground">Community-driven e-bike charging</p>
        </div>
        {children}
      </div>
    </div>
  )
}
