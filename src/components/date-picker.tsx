import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CalendarIcon, X } from 'lucide-react'
import { useState } from 'react'

type Props = {
  // yyyy-mm-dd (the format the app stores everywhere — Postgres DATE). `null`
  // or empty string = unset.
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showClear?: boolean
  'aria-invalid'?: boolean
  id?: string
}

function parse(value: string | null): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return undefined
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  className,
  showClear = true,
  'aria-invalid': ariaInvalid,
  id,
}: Props) {
  const [open, setOpen] = useState(false)
  const selected = parse(value)

  const label = selected
    ? selected.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      })
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            className={cn(
              'w-full justify-start font-normal',
              !selected && 'text-muted-foreground',
              className,
            )}
          />
        }
      >
        <CalendarIcon className="size-4" />
        <span className="flex-1 truncate text-left">{label}</span>
        {showClear && selected && !disabled && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date"
            className="hover:bg-muted rounded-sm p-0.5"
            onClick={(e) => {
              e.stopPropagation()
              onChange(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onChange(null)
              }
            }}
          >
            <X className="size-3.5" />
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            onChange(d ? toIso(d) : null)
            setOpen(false)
          }}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  )
}
