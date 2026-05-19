import { cn } from '@/lib/utils'
import { useMemo } from 'react'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 6×7 grid starting on the Monday on-or-before the 1st of `month`. Matches
// the layout used on the Reports page so the look is consistent.
function buildMonthGrid(month: Date): Date[] {
  const y = month.getFullYear()
  const m = month.getMonth()
  const first = new Date(y, m, 1)
  const firstWeekday = (first.getDay() + 6) % 7
  const start = new Date(y, m, 1 - firstWeekday)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }
  return cells
}

type Props = {
  month: Date
  selected?: string | null // yyyy-mm-dd
  onSelect?: (iso: string) => void
  // Dates that should render the green-dot "filled" indicator.
  filledDates?: Iterable<string>
  // Optional extra disable matcher (e.g. weekends). Out-of-month days are
  // always disabled.
  disabled?: (d: Date) => boolean
  className?: string
}

export function MonthGrid({
  month,
  selected,
  onSelect,
  filledDates,
  disabled,
  className,
}: Props) {
  const cells = useMemo(() => buildMonthGrid(month), [month])
  const monthIndex = month.getMonth()
  const today = fmt(new Date())
  const filledSet = useMemo(
    () => new Set<string>(filledDates ? [...filledDates] : []),
    [filledDates],
  )

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-lg border', className)}>
      <div className="text-muted-foreground grid grid-cols-7 border-b text-center text-[10px] font-medium uppercase">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1.5">
            {w}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {cells.map((d) => {
          const inMonth = d.getMonth() === monthIndex
          const key = fmt(d)
          const isToday = key === today
          const isSelected = key === selected
          const isFilled = filledSet.has(key)
          const extraDisabled = disabled ? disabled(d) : false
          const clickable = inMonth && !extraDisabled
          return (
            <button
              key={key}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelect?.(key)}
              className={cn(
                'group relative flex min-h-12 flex-col items-start border-r border-b p-1.5 text-left transition-colors',
                !inMonth &&
                  'bg-muted/20 text-muted-foreground cursor-not-allowed opacity-50',
                inMonth &&
                  extraDisabled &&
                  'bg-muted/20 text-muted-foreground cursor-not-allowed opacity-50',
                clickable && 'hover:bg-muted/50 cursor-pointer',
                isSelected && clickable && 'bg-primary/10 ring-primary/60 ring-1',
              )}
            >
              <span
                className={cn(
                  'text-xs font-medium',
                  isToday &&
                    'bg-primary text-primary-foreground inline-flex size-5 items-center justify-center rounded-full',
                )}
              >
                {d.getDate()}
              </span>
              {inMonth && isFilled && (
                <span className="mt-auto flex items-center gap-1 text-[10px] font-medium">
                  <span className="size-1.5 rounded-full bg-green-600 dark:bg-green-500" />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
