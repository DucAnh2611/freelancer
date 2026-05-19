import { LabelRequire } from '@/components/label-require'
import { MonthGrid } from '@/components/month-grid'
import { SelectCombobox } from '@/components/select-combobox'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { useRunJobIntegration } from '@/hooks/use-integrations'
import { useText } from '@/hooks/use-text'
import type { JobWithRelations } from '@/services/jobs'
import type {
  IntegrationOffDateRow,
  IntegrationReportRow,
} from '@/services/integrations'
import { listOffDatesInRange, listReportsInRange } from '@/services/reports'
import type { OffDateType } from '@/types/database'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: JobWithRelations
  onIntegrated?: () => void
}

type ReportEntry = { description: string; otHours: string }
type OffEntry = {
  type: OffDateType
  title: string
  description: string
  partialOffHours: string
}

function isWeekend(d: Date) {
  const g = d.getDay()
  return g === 0 || g === 6
}

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Integration is an import of *historical* data. Today itself is owned by the
// live report flow, and future dates don't have any history yet — so anything
// ≥ the start of today is disallowed.
const TODAY_START = (() => {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return t.getTime()
})()

function isTodayOrFuture(d: Date) {
  return d.getTime() >= TODAY_START
}

export function JobIntegrationDialog({ open, onOpenChange, job, onIntegrated }: Props) {
  const { text } = useText()
  const { profile } = useAuth()
  const run = useRunJobIntegration()

  // Per-date entries keyed by yyyy-mm-dd. The calendar cells read these to
  // paint "filled" state; the nested edit dialog binds controlled inputs to
  // the selected entry so every keystroke persists into the draft.
  const [reports, setReports] = useState<Record<string, ReportEntry>>({})
  const [offs, setOffs] = useState<Record<string, OffEntry>>({})

  const [month, setMonth] = useState<Date>(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })

  // Fetch whatever already lives in daily_reports / off_dates for this job in
  // the displayed month — those dates are off-limits for integration so we
  // don't clobber history. Employee's user_id is unused by the service (RLS
  // scopes it) but we pass it anyway for cache keying.
  const rangeFrom = useMemo(
    () => toIso(new Date(month.getFullYear(), month.getMonth(), 1)),
    [month],
  )
  const rangeTo = useMemo(
    () => toIso(new Date(month.getFullYear(), month.getMonth() + 1, 0)),
    [month],
  )
  const userId = job.employee_id ?? ''
  const existingReports = useQuery({
    queryKey: ['reports', 'range', userId, rangeFrom, rangeTo],
    queryFn: () => listReportsInRange(userId, rangeFrom, rangeTo),
    enabled: Boolean(userId),
  })
  const existingOffs = useQuery({
    queryKey: ['off-dates', 'range', userId, rangeFrom, rangeTo],
    queryFn: () => listOffDatesInRange(userId, rangeFrom, rangeTo),
    enabled: Boolean(userId),
  })

  const takenDates = useMemo(() => {
    const set = new Set<string>()
    for (const r of existingReports.data ?? []) {
      if (r.job_id === job.id && r.user_id === userId) set.add(r.report_date)
    }
    for (const o of existingOffs.data ?? []) {
      if (o.job_id === job.id && o.user_id === userId) set.add(o.date)
    }
    return set
  }, [existingReports.data, existingOffs.data, job.id, userId])
  // Null ⇒ no edit modal open. Setting non-null opens the nested modal bound
  // to that date's entry.
  const [editingReport, setEditingReport] = useState<string | null>(null)
  const [editingOff, setEditingOff] = useState<string | null>(null)
  const [includeWeekends, setIncludeWeekends] = useState(false)
  // Errors are computed on every keystroke but stay hidden until the user
  // actually tries to submit — that's the point at which validation becomes
  // "interesting", and showing it sooner creates visual noise while typing.
  const [submitAttempted, setSubmitAttempted] = useState(false)

  function reset() {
    setReports({})
    setOffs({})
    setEditingReport(null)
    setEditingOff(null)
    setIncludeWeekends(false)
    setSubmitAttempted(false)
  }

  const reportDates = useMemo(() => Object.keys(reports).sort(), [reports])
  const offDates = useMemo(() => Object.keys(offs).sort(), [offs])

  const validation = useMemo(() => {
    const reportRows: IntegrationReportRow[] = []
    const offRows: IntegrationOffDateRow[] = []
    const errors: string[] = []

    for (const date of reportDates) {
      const e = reports[date]
      if (!e.description.trim() && !e.otHours) continue
      if (!e.description.trim()) {
        errors.push(`Report ${date}: description required`)
        continue
      }
      const ot = Number(e.otHours || 0)
      if (Number.isNaN(ot) || ot < 0) {
        errors.push(`Report ${date}: ot_hours must be ≥ 0`)
        continue
      }
      reportRows.push({ date, description: e.description.trim(), otHours: ot })
    }

    for (const date of offDates) {
      const e = offs[date]
      const hasAny = e.title.trim() || e.description.trim() || e.partialOffHours
      if (!hasAny) continue
      if (!e.title.trim()) {
        errors.push(`Off ${date}: title required`)
        continue
      }
      let partial: number | null = null
      if (e.partialOffHours) {
        const n = Number(e.partialOffHours)
        if (Number.isNaN(n) || n <= 0) {
          errors.push(`Off ${date}: partial_hours must be > 0`)
          continue
        }
        partial = n
      }
      offRows.push({
        date,
        type: e.type,
        title: e.title.trim(),
        description: e.description.trim() || null,
        partialOffHours: partial,
      })
    }

    return { reportRows, offRows, errors }
  }, [reports, offs, reportDates, offDates])

  const totalRows = validation.reportRows.length + validation.offRows.length

  async function handleConfirm() {
    setSubmitAttempted(true)
    if (!job.employee_id) {
      toast.error(text.page.jobs.detail.integrateResultNoEmployee)
      return
    }
    if (!profile) return
    if (totalRows === 0) {
      toast.error(text.page.jobs.detail.integrateEmpty)
      return
    }
    if (validation.errors.length) {
      toast.error(validation.errors[0])
      return
    }
    try {
      await run.mutateAsync({
        jobId: job.id,
        userId: job.employee_id,
        performedBy: profile.id,
        reports: validation.reportRows,
        offDates: validation.offRows,
      })
      toast.success(text.page.jobs.detail.integrateDone)
      onIntegrated?.()
      onOpenChange(false)
      reset()
    } catch (err) {
      const msg = err instanceof Error ? err.message : text.page.jobs.detail.integrateFailed
      toast.error(msg)
    }
  }

  function openReportDay(key: string) {
    setReports((curr) =>
      curr[key] ? curr : { ...curr, [key]: { description: '', otHours: '0' } },
    )
    setEditingReport(key)
  }

  function openOffDay(key: string) {
    setOffs((curr) =>
      curr[key]
        ? curr
        : {
            ...curr,
            [key]: { type: 'SAL', title: '', description: '', partialOffHours: '' },
          },
    )
    setEditingOff(key)
  }

  function updateReport(date: string, patch: Partial<ReportEntry>) {
    setReports((curr) => ({ ...curr, [date]: { ...curr[date], ...patch } }))
  }

  function updateOff(date: string, patch: Partial<OffEntry>) {
    setOffs((curr) => ({ ...curr, [date]: { ...curr[date], ...patch } }))
  }

  function removeReport(date: string) {
    setReports((curr) => {
      const { [date]: _, ...rest } = curr
      return rest
    })
    if (editingReport === date) setEditingReport(null)
  }

  function removeOff(date: string) {
    setOffs((curr) => {
      const { [date]: _, ...rest } = curr
      return rest
    })
    if (editingOff === date) setEditingOff(null)
  }

  const reportDraft = editingReport ? reports[editingReport] : null
  const offDraft = editingOff ? offs[editingOff] : null

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent className="flex h-[92dvh] w-[95dvw] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b p-4">
          <DialogTitle>{text.page.jobs.detail.integrateTitle}</DialogTitle>
          <DialogDescription>{text.page.jobs.detail.integrateDesc}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="reports" className="flex flex-col gap-3">
            <TabsList>
              <TabsTrigger value="reports">
                {text.page.jobs.detail.integrateTabReports}{' '}
                <span className="text-muted-foreground ml-1 text-xs">
                  ({validation.reportRows.length})
                </span>
              </TabsTrigger>
              <TabsTrigger value="offs">
                {text.page.jobs.detail.integrateTabOffs}{' '}
                <span className="text-muted-foreground ml-1 text-xs">
                  ({validation.offRows.length})
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="space-y-3">
              <MonthNav month={month} onChange={setMonth} />
              <MonthGrid
                month={month}
                selected={editingReport}
                onSelect={openReportDay}
                filledDates={reportDates}
                disabled={(d) =>
                  isTodayOrFuture(d) ||
                  takenDates.has(toIso(d)) ||
                  (!includeWeekends && isWeekend(d))
                }
                className="h-80"
              />
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={includeWeekends}
                  onCheckedChange={(v) => setIncludeWeekends(v === true)}
                />
                Include weekends
              </label>
              {reportDates.length > 0 && (
                <ReportsList
                  dates={reportDates}
                  entries={reports}
                  onSelect={(d) => setEditingReport(d)}
                  onRemove={removeReport}
                />
              )}
            </TabsContent>

            <TabsContent value="offs" className="space-y-3">
              <MonthNav month={month} onChange={setMonth} />
              <MonthGrid
                month={month}
                selected={editingOff}
                onSelect={openOffDay}
                filledDates={offDates}
                disabled={(d) => isTodayOrFuture(d) || takenDates.has(toIso(d))}
                className="h-80"
              />
              {offDates.length > 0 && (
                <OffsList
                  dates={offDates}
                  entries={offs}
                  onSelect={(d) => setEditingOff(d)}
                  onRemove={removeOff}
                />
              )}
            </TabsContent>
          </Tabs>

          {submitAttempted && validation.errors.length > 0 && (
            <ul className="text-destructive mt-3 space-y-0.5 text-xs">
              {validation.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t p-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={run.isPending}
          >
            {text.page.jobs.form.confirmSaveCancel}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={
              run.isPending ||
              totalRows === 0 ||
              validation.errors.length > 0 ||
              !job.employee_id
            }
          >
            {run.isPending
              ? text.page.jobs.detail.integrateRunning
              : text.page.jobs.detail.integrateConfirm
                  .replace('{reports}', String(validation.reportRows.length))
                  .replace('{offs}', String(validation.offRows.length))}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Per-day edit sub-dialog. Bound directly to the entry in state, so
          typing persists even if the user closes without an explicit save. */}
      <Dialog
        open={Boolean(editingReport)}
        onOpenChange={(v) => !v && setEditingReport(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReport}</DialogTitle>
            <DialogDescription>
              {text.page.jobs.detail.integrateTabReports}
            </DialogDescription>
          </DialogHeader>
          {editingReport && reportDraft && (
            <div className="space-y-3">
              <div>
                <label className="text-muted-foreground text-xs">OT hours</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min={0}
                  value={reportDraft.otHours}
                  onChange={(e) =>
                    updateReport(editingReport, { otHours: e.target.value })
                  }
                />
              </div>
              <div>
                <LabelRequire className="text-xs">
                  Description (markdown)
                </LabelRequire>
                <Textarea
                  rows={8}
                  autoFocus
                  aria-invalid={!reportDraft.description.trim()}
                  value={reportDraft.description}
                  onChange={(e) =>
                    updateReport(editingReport, { description: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => editingReport && removeReport(editingReport)}
            >
              Clear day
            </Button>
            <Button type="button" onClick={() => setEditingReport(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingOff)}
        onOpenChange={(v) => !v && setEditingOff(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOff}</DialogTitle>
            <DialogDescription>
              {text.page.jobs.detail.integrateTabOffs}
            </DialogDescription>
          </DialogHeader>
          {editingOff && offDraft && (
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div>
                  <LabelRequire className="text-xs">Type</LabelRequire>
                  <SelectCombobox
                    items={[
                      { value: 'SAL', label: 'Paid (SAL)' },
                      { value: 'NOT_SAL', label: 'Unpaid (NOT_SAL)' },
                    ]}
                    value={offDraft.type}
                    onChange={(v) =>
                      v && updateOff(editingOff, { type: v as OffDateType })
                    }
                  />
                </div>
                <div className="w-28">
                  <label className="text-muted-foreground text-xs">Partial h</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min={0}
                    placeholder="—"
                    value={offDraft.partialOffHours}
                    onChange={(e) =>
                      updateOff(editingOff, { partialOffHours: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <LabelRequire className="text-xs">Title</LabelRequire>
                <Input
                  autoFocus
                  aria-invalid={!offDraft.title.trim()}
                  value={offDraft.title}
                  onChange={(e) => updateOff(editingOff, { title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-muted-foreground text-xs">
                  Description (markdown, optional)
                </label>
                <Textarea
                  rows={4}
                  value={offDraft.description}
                  onChange={(e) =>
                    updateOff(editingOff, { description: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => editingOff && removeOff(editingOff)}
            >
              Clear day
            </Button>
            <Button type="button" onClick={() => setEditingOff(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

function MonthNav({
  month,
  onChange,
}: {
  month: Date
  onChange: (d: Date) => void
}) {
  // Clamp forward navigation: all cells past today are disabled anyway, so
  // landing on a future month just shows a wall of greyed-out cells.
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const atCap = month.getTime() >= currentMonthStart
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        aria-label="Previous month"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="text-sm font-medium">
        {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={atCap}
        onClick={() => onChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        aria-label="Next month"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}

function firstLine(text: string, max = 80): string {
  const first = text.split('\n').find((l) => l.trim().length > 0) ?? ''
  return first.length > max ? `${first.slice(0, max)}\u2026` : first
}

function ReportsList({
  dates,
  entries,
  onSelect,
  onRemove,
}: {
  dates: string[]
  entries: Record<string, ReportEntry>
  onSelect: (d: string) => void
  onRemove: (d: string) => void
}) {
  return (
    <ul className="divide-border divide-y rounded-lg border">
      {dates.map((d) => {
        const e = entries[d]
        const ot = Number(e.otHours || 0)
        return (
          <li key={d} className="flex items-center gap-2 p-2 text-xs">
            <button
              type="button"
              onClick={() => onSelect(d)}
              className="hover:bg-muted/50 -m-1 flex min-w-0 flex-1 items-center gap-2 rounded p-1 text-left"
            >
              <span className="font-mono text-[10px]">{d}</span>
              <span className="text-muted-foreground min-w-0 flex-1 truncate">
                {firstLine(e.description) || '(no description)'}
              </span>
              {ot > 0 && (
                <span className="bg-primary/10 text-primary rounded px-1 py-0.5 text-[10px] font-medium">
                  OT {ot}h
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label="Remove"
              onClick={() => onRemove(d)}
              className="hover:text-destructive text-muted-foreground p-1"
            >
              <X className="size-3.5" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function OffsList({
  dates,
  entries,
  onSelect,
  onRemove,
}: {
  dates: string[]
  entries: Record<string, OffEntry>
  onSelect: (d: string) => void
  onRemove: (d: string) => void
}) {
  return (
    <ul className="divide-border divide-y rounded-lg border">
      {dates.map((d) => {
        const e = entries[d]
        return (
          <li key={d} className="flex items-center gap-2 p-2 text-xs">
            <button
              type="button"
              onClick={() => onSelect(d)}
              className="hover:bg-muted/50 -m-1 flex min-w-0 flex-1 items-center gap-2 rounded p-1 text-left"
            >
              <span className="font-mono text-[10px]">{d}</span>
              <span
                className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                  e.type === 'SAL'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {e.type === 'SAL' ? 'Paid' : 'Unpaid'}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {e.title || (
                  <span className="text-muted-foreground">(no title)</span>
                )}
              </span>
              {e.partialOffHours && (
                <span className="bg-muted text-muted-foreground rounded px-1 py-0.5 text-[10px]">
                  {e.partialOffHours}h
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label="Remove"
              onClick={() => onRemove(d)}
              className="hover:text-destructive text-muted-foreground p-1"
            >
              <X className="size-3.5" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
