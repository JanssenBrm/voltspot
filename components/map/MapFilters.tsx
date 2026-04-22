'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ALL_PLUG_TYPES } from '@/lib/plugTypes'

export interface Filters {
  plugType: string
  freeOnly: boolean
  verifiedOnly: boolean
  indoorOnly: boolean
}

interface MapFiltersProps {
  filters: Filters
  onFiltersChange: (f: Filters) => void
}

export default function MapFilters({ filters, onFiltersChange }: MapFiltersProps) {
  const [open, setOpen] = useState(false)

  const update = (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch })

  const activeCount = [
    filters.plugType !== 'all',
    filters.freeOnly,
    filters.verifiedOnly,
    filters.indoorOnly,
  ].filter(Boolean).length

  return (
    <div className="bg-background/95 backdrop-blur rounded-2xl border border-border/70 shadow-sm">
      <button
        className="flex items-center gap-2.5 px-4 py-3 w-full text-sm font-medium"
        onClick={() => setOpen((o) => !o)}
      >
        <Filter className="h-4 w-4 text-primary" />
        Filters
        {activeCount > 0 && (
          <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
            {activeCount}
          </span>
        )}
        {open ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Plug Type</Label>
            <Select value={filters.plugType} onValueChange={(v) => update({ plugType: v ?? 'all' })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Any plug type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any plug type</SelectItem>
                {ALL_PLUG_TYPES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(
            [
              ['freeOnly', 'Free stations only'],
              ['verifiedOnly', 'Verified stations only'],
              ['indoorOnly', 'Indoor stations only'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={key}
                checked={filters[key]}
                onCheckedChange={(v) => update({ [key]: !!v })}
              />
              <Label htmlFor={key} className="text-sm cursor-pointer">{label}</Label>
            </div>
          ))}

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => update({ plugType: 'all', freeOnly: false, verifiedOnly: false, indoorOnly: false })}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
