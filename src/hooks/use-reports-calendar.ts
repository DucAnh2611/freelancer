import {
  bucketByDay,
  listOffDatesInRange,
  listReportsInRange,
  type DaySummary,
} from '@/services/reports'
import { useQuery } from '@tanstack/react-query'

function fmtDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Returns a { 'yyyy-mm-dd' → DaySummary } map for the month that contains
// `month`. Fetches reports + off_dates in parallel and buckets client-side.
export function useReportsCalendar(userId: string | null | undefined, month: Date) {
  const year = month.getFullYear()
  const m = month.getMonth()
  const firstOfMonth = new Date(year, m, 1)
  const lastOfMonth = new Date(year, m + 1, 0)
  const from = fmtDate(firstOfMonth)
  const to = fmtDate(lastOfMonth)

  const reports = useQuery({
    queryKey: ['reports', 'range', userId, from, to],
    queryFn: () => listReportsInRange(userId as string, from, to),
    enabled: Boolean(userId),
  })

  const offs = useQuery({
    queryKey: ['off-dates', 'range', userId, from, to],
    queryFn: () => listOffDatesInRange(userId as string, from, to),
    enabled: Boolean(userId),
  })

  const data: Record<string, DaySummary> = bucketByDay(reports.data ?? [], offs.data ?? [])

  return {
    data,
    isLoading: reports.isLoading || offs.isLoading,
    refetch: async () => {
      await Promise.all([reports.refetch(), offs.refetch()])
    },
    from,
    to,
  }
}

export { fmtDate }
