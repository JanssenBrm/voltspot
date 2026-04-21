'use client'

import { useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchBarProps {
  onLocationFound: (location: { lat: number; lng: number; name: string }) => void
}

export default function SearchBar({ onLocationFound }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
      )
      const data = await res.json()
      if (data.length === 0) {
        setError('Location not found')
        return
      }
      onLocationFound({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name })
      setQuery('')
    } catch {
      setError('Search failed')
    } finally {
      setLoading(false)
    }
  }, [query, onLocationFound])

  return (
    <div className="relative flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search location..."
          className="pl-8 pr-8 bg-background/95 backdrop-blur border-border/50"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        {query && (
          <button
            className="absolute right-2 top-2.5"
            onClick={() => { setQuery(''); setError(null) }}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      <Button size="sm" onClick={search} disabled={loading}>
        {loading ? '...' : 'Go'}
      </Button>
      {error && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-destructive/10 text-destructive text-xs p-2 rounded">
          {error}
        </div>
      )}
    </div>
  )
}
