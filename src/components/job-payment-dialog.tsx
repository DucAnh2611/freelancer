import { computeSalary, formatVND } from '@/components/salary-preview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SelectCombobox } from '@/components/select-combobox'
import { rateSuffix } from '@/constants/jobs'
import { useConstants } from '@/hooks/use-constants'
import { useText } from '@/hooks/use-text'
import { cn } from '@/lib/utils'
import type { JobWithRelations } from '@/services/jobs'
import { listOffDatesInRange, listReportsInRange, type DailyReport, type OffDate } from '@/services/reports'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: JobWithRelations
}

function fmt(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Enumerate every day of the month so the table shows a stable grid even on
// empty days.
function daysInMonth(month: Date): string[] {
  const y = month.getFullYear()
  const m = month.getMonth()
  const last = new Date(y, m + 1, 0).getDate()
  const out: string[] = []
  for (let d = 1; d <= last; d++) {
    out.push(fmt(new Date(y, m, d)))
  }
  return out
}

export function JobPaymentDialog({ open, onOpenChange, job }: Props) {
  const { text } = useText()
  const { record } = useConstants({ rateSuffix })
  const rateLabel = record('rateSuffix').get(job.rate_type, '')
  const [month, setMonth] = useState<Date>(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [otRecipient, setOtRecipient] = useState<'hirer' | 'employee'>('employee')
  const [includeOtTax, setIncludeOtTax] = useState(false)

  const from = fmt(new Date(month.getFullYear(), month.getMonth(), 1))
  const to = fmt(new Date(month.getFullYear(), month.getMonth() + 1, 0))

  const employeeId = job.employee_id ?? ''
  const reportsQuery = useQuery({
    queryKey: ['reports', 'range', employeeId, job.id, from, to],
    queryFn: () => listReportsInRange(employeeId, from, to),
    enabled: Boolean(employeeId && open),
  })
  const offsQuery = useQuery({
    queryKey: ['off-dates', 'range', employeeId, job.id, from, to],
    queryFn: () => listOffDatesInRange(employeeId, from, to),
    enabled: Boolean(employeeId && open),
  })

  const reports = (reportsQuery.data ?? []).filter((r) => r.job_id === job.id)
  const offs = (offsQuery.data ?? []).filter((o) => o.job_id === job.id)

  const workingHours = Number(job.working_hours) || 8
  const reportByDate = useMemo(() => {
    const m = new Map<string, DailyReport>()
    for (const r of reports) m.set(r.report_date, r)
    return m
  }, [reports])
  const offByDate = useMemo(() => {
    const m = new Map<string, OffDate>()
    for (const o of offs) m.set(o.date, o)
    return m
  }, [offs])

  // Derive per-day stats + paid-work units.
  const { units, totalOt, workingDays, paidOffDays, unpaidOffDays, hoursLogged } =
    useMemo(() => {
      let units = 0
      let totalOt = 0
      let workingDays = 0
      let paidOff = 0
      let unpaidOff = 0
      let hoursLogged = 0
      for (const r of reports) {
        units += 1
        workingDays += 1
        hoursLogged += workingHours
        totalOt += Number(r.ot_hours ?? 0) || 0
      }
      for (const o of offs) {
        if (reportByDate.has(o.date)) continue
        if (o.type === 'SAL') {
          paidOff += 1
          if (o.partial_off_hours != null) {
            const partial = Math.max(0, Number(o.partial_off_hours))
            units += partial / workingHours
            hoursLogged += partial
          } else {
            units += 1
            hoursLogged += workingHours
          }
        } else {
          unpaidOff += 1
        }
      }
      return {
        units: Math.round(units * 100) / 100,
        totalOt: Math.round(totalOt * 100) / 100,
        workingDays,
        paidOffDays: paidOff,
        unpaidOffDays: unpaidOff,
        hoursLogged: Math.round(hoursLogged * 100) / 100,
      }
    }, [reports, offs, reportByDate, workingHours])

  const expectedHours = useMemo(() => {
    // Sum of days in the month × working_hours is too optimistic; use
    // workingDays + paidOffDays as "scheduled" days.
    return (workingDays + paidOffDays) * workingHours
  }, [workingDays, paidOffDays, workingHours])

  // Rate-type-aware base gross + implied hourly rate for OT.
  //   hourly  → amount is per hour; baseGross = amount × hoursLogged
  //   daily   → amount is per day;  baseGross = amount × units (days)
  //   monthly → amount is a fixed monthly; prorate by scheduled-day coverage
  //              so unpaid leave pulls it down. If there's nothing scheduled,
  //              fall back to a flat month.
  const { baseGross, hourlyRate, baseFormula } = useMemo(() => {
    if (job.rate_type === 'hourly') {
      return {
        baseGross: job.amount * hoursLogged,
        hourlyRate: job.amount,
        baseFormula: `${formatVND(job.amount)} × ${hoursLogged}h`,
      }
    }
    if (job.rate_type === 'monthly') {
      const scheduled = workingDays + paidOffDays + unpaidOffDays
      const earnedDays = workingDays + (units - workingDays) // units - workingDays = paid-off fractions
      const ratio = scheduled > 0 ? earnedDays / scheduled : 1
      const scheduledHours = scheduled * workingHours
      return {
        baseGross: job.amount * ratio,
        hourlyRate: scheduledHours > 0 ? job.amount / scheduledHours : 0,
        baseFormula:
          scheduled > 0
            ? `${formatVND(job.amount)} × ${earnedDays}/${scheduled}d`
            : formatVND(job.amount),
      }
    }
    // daily (default)
    return {
      baseGross: job.amount * units,
      hourlyRate: workingHours > 0 ? job.amount / workingHours : 0,
      baseFormula: `${formatVND(job.amount)} × ${units}d`,
    }
  }, [
    job.amount,
    job.rate_type,
    units,
    hoursLogged,
    workingDays,
    paidOffDays,
    unpaidOffDays,
    workingHours,
  ])

  const baseSalary = computeSalary({
    amount: baseGross,
    hirerRatePct: job.hirer_rate,
    employeeRatePct: job.employee_rate,
    jobTaxPct: job.job_tax_rate,
    personalTaxPct: job.personal_tax_rate,
  })

  const otGross = hourlyRate * totalOt
  const otSalary = includeOtTax
    ? computeSalary({
        amount: otGross,
        hirerRatePct: 100,
        employeeRatePct: 0,
        jobTaxPct: job.job_tax_rate,
        personalTaxPct: job.personal_tax_rate,
      })
    : null
  const otNet = otSalary ? otSalary.hirerNet : otGross
  const otTax = otSalary ? otGross - otSalary.hirerNet : 0

  const totalTax =
    baseSalary.totalJobTax + baseSalary.totalPersonalTax + otTax
  const hirerTotal =
    baseSalary.hirerNet + (otRecipient === 'hirer' ? otNet : 0)
  const employeeTotal =
    baseSalary.employeeNet + (otRecipient === 'employee' ? otNet : 0)

  const monthDays = useMemo(() => daysInMonth(month), [month])
  const today = fmt(new Date())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[95dvh] w-[95dvw] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl [&>button]:top-3">
        <DialogHeader className="shrink-0 border-b p-4">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <span className="flex-1">{text.page.jobs.detail.calcTitle}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
              }
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-normal">
              {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
              }
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </DialogTitle>
          <p className="text-muted-foreground pr-8 text-xs">
            {formatVND(job.amount)}
            {rateLabel}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {/* Summary row */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label={text.page.jobs.detail.calcTotalTax} value={formatVND(totalTax)} />
            <Stat
              label={text.page.jobs.detail.calcHirer}
              value={formatVND(hirerTotal)}
              emphasized
            />
            <Stat
              label={text.page.jobs.detail.calcEmployee}
              value={formatVND(employeeTotal)}
              emphasized
            />
            <Stat
              label={text.page.jobs.detail.calcOT}
              value={formatVND(otNet)}
              sub={`${totalOt}h → ${otRecipient === 'hirer' ? text.page.jobs.detail.calcHirer : text.page.jobs.detail.calcEmployee}`}
            />
          </div>

          {/* Base rate formula so the hirer can see how baseGross was derived. */}
          <div className="text-muted-foreground rounded-lg border p-3 text-xs">
            <span className="font-medium">{text.page.jobs.detail.calcBaseLabel}:</span>{' '}
            <span className="font-mono">{baseFormula}</span>{' '}
            <span>=</span>{' '}
            <span className="text-foreground font-semibold">{formatVND(baseGross)}</span>
          </div>

          {/* Options */}
          <div className="space-y-2 rounded-lg border p-3 text-sm">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">
                {text.page.jobs.detail.calcAssignOT}
              </label>
              <SelectCombobox
                items={[
                  {
                    value: 'hirer',
                    label: text.page.jobs.detail.calcAssignOTHirer,
                  },
                  {
                    value: 'employee',
                    label: text.page.jobs.detail.calcAssignOTEmployee,
                  },
                ]}
                value={otRecipient}
                onChange={(v) => v && setOtRecipient(v as 'hirer' | 'employee')}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={includeOtTax}
                onCheckedChange={(v) => setIncludeOtTax(v === true)}
              />
              {text.page.jobs.detail.calcIncludeOtTax}
            </label>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 text-xs sm:grid-cols-3">
            <Metric
              label={text.page.jobs.detail.calcStatsWorkingDays}
              value={String(workingDays)}
            />
            <Metric
              label={text.page.jobs.detail.calcStatsPaidOff}
              value={String(paidOffDays)}
            />
            <Metric
              label={text.page.jobs.detail.calcStatsUnpaidOff}
              value={String(unpaidOffDays)}
            />
            <Metric
              label={text.page.jobs.detail.calcStatsHoursLogged}
              value={`${hoursLogged}h`}
            />
            <Metric
              label={text.page.jobs.detail.calcStatsExpectedHours}
              value={`${expectedHours}h`}
            />
            <Metric
              label={text.page.jobs.detail.calcStatsOtHours}
              value={`${totalOt}h`}
            />
          </div>

          {/* Per-day table */}
          <div className="overflow-hidden rounded-lg border text-xs">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium">
                    {text.page.jobs.detail.calcTableDate}
                  </th>
                  <th className="p-2 text-left font-medium">
                    {text.page.jobs.detail.calcTableStatus}
                  </th>
                  <th className="p-2 text-right font-medium">
                    {text.page.jobs.detail.calcTableHours}
                  </th>
                  <th className="p-2 text-right font-medium">
                    {text.page.jobs.detail.calcTableOt}
                  </th>
                  <th className="p-2 text-right font-medium">
                    {text.page.jobs.detail.calcTableReportAt}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {monthDays.map((d) => {
                  const r = reportByDate.get(d)
                  const o = offByDate.get(d)
                  let status: React.ReactNode = (
                    <span className="text-muted-foreground">—</span>
                  )
                  let hours = ''
                  let ot = ''
                  let at = ''
                  if (r) {
                    status = (
                      <Badge variant="default" className="h-4 px-1 text-[9px]">
                        Report
                      </Badge>
                    )
                    hours = `${workingHours}h`
                    ot = r.ot_hours ? `${r.ot_hours}h` : '—'
                    at = new Date(r.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  } else if (o) {
                    status = (
                      <Badge
                        variant={o.type === 'SAL' ? 'secondary' : 'outline'}
                        className="h-4 px-1 text-[9px]"
                      >
                        {o.type === 'SAL' ? 'Paid off' : 'Off'}{' '}
                        {o.partial_off_hours != null ? `· ${o.partial_off_hours}h` : ''}
                      </Badge>
                    )
                    hours =
                      o.type === 'SAL'
                        ? o.partial_off_hours != null
                          ? `${o.partial_off_hours}h`
                          : `${workingHours}h`
                        : '—'
                    ot = '—'
                    at = o.title
                  }
                  return (
                    <tr
                      key={d}
                      className={cn(d === today && 'bg-primary/5')}
                    >
                      <td className="p-2 font-mono text-[10px]">{d}</td>
                      <td className="p-2">{status}</td>
                      <td className="p-2 text-right">{hours || '—'}</td>
                      <td className="p-2 text-right">{ot || '—'}</td>
                      <td className="p-2 text-right">{at || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stat({
  label,
  value,
  sub,
  emphasized,
}: {
  label: string
  value: string
  sub?: string
  emphasized?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 text-sm',
        emphasized && 'bg-primary/5 border-primary/40',
      )}
    >
      <p className="text-muted-foreground text-[10px] font-medium uppercase">{label}</p>
      <p className={cn('mt-0.5', emphasized ? 'font-semibold' : 'font-medium')}>{value}</p>
      {sub && <p className="text-muted-foreground mt-0.5 text-[10px]">{sub}</p>}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
