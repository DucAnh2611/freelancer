import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { JobIdLink } from '@/components/job-id-link'
import { LongPressPreviewDialog } from '@/components/long-press-preview-dialog'
import { Markdown } from '@/components/markdown'
import { useAuth } from '@/hooks/use-auth'
import { useLongPress } from '@/hooks/use-long-press'
import { fmtDate, useReportsCalendar } from '@/hooks/use-reports-calendar'
import { useReportEdits } from '@/hooks/use-reports'
import { useText } from '@/hooks/use-text'
import { useWindowTitle } from '@/hooks/use-window-title'
import { cn } from '@/lib/utils'
import type { DailyReport, DaySummary, ReportEdit } from '@/services/reports'
import { Check, ChevronLeft, ChevronRight, Copy, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

// Build a 6×7 grid of dates that starts on the Monday on/before the 1st of
// `month` and covers enough weeks to include the last day of `month`. Cells
// outside the focused month are returned too so the layout is stable.
function buildMonthGrid(month: Date): Date[] {
  const y = month.getFullYear()
  const m = month.getMonth()
  const first = new Date(y, m, 1)
  // Monday = 0, Tuesday = 1, … Sunday = 6
  const firstWeekday = (first.getDay() + 6) % 7
  const start = new Date(y, m, 1 - firstWeekday)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }
  return cells
}

export default function ReportsPage() {
  const { text } = useText()
  const { profile } = useAuth()
  useWindowTitle(text.page.reports.title)

  const [month, setMonth] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selected, setSelected] = useState<Date | null>(null)
  const [preview, setPreview] = useState<DailyReport | null>(null)

  const { data: summaries, isLoading } = useReportsCalendar(profile?.id ?? null, month)

  const selectedKey = selected ? fmtDate(selected) : null
  const selectedSummary = selectedKey ? summaries[selectedKey] : null

  const cells = useMemo(() => buildMonthGrid(month), [month])
  const monthIndex = month.getMonth()
  const today = fmtDate(new Date())

  function stepMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <h1 className="text-base font-semibold">
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h1>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => stepMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setMonth(() => {
                const n = new Date()
                return new Date(n.getFullYear(), n.getMonth(), 1)
              })
            }
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => stepMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="text-muted-foreground grid grid-cols-7 border-b text-center text-[10px] font-medium uppercase">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1.5">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid fills remaining height */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {cells.map((d) => {
          const inMonth = d.getMonth() === monthIndex
          const key = fmtDate(d)
          const summary = summaries[key]
          const reportCount = summary?.reports.length ?? 0
          const isToday = key === today
          return (
            <button
              key={key}
              type="button"
              disabled={!inMonth}
              onClick={() => inMonth && setSelected(d)}
              className={cn(
                'group relative flex flex-col items-start border-r border-b p-1.5 text-left transition-colors',
                inMonth
                  ? 'hover:bg-muted/50 cursor-pointer'
                  : 'bg-muted/20 text-muted-foreground cursor-not-allowed opacity-50',
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
              {inMonth && reportCount > 0 && (
                <span className="mt-auto flex items-center gap-1 text-[10px] font-medium">
                  <span className="size-1.5 rounded-full bg-green-600 dark:bg-green-500" />
                  <span className="text-green-600 dark:text-green-500">{reportCount}</span>
                </span>
              )}
            </button>
          )
        })}
      </div>

      {isLoading && (
        <p className="text-muted-foreground p-2 text-center text-xs">…</p>
      )}

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(v) => !v && setSelected(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {text.page.reports.dayDetailTitle}
              {selected && (
                <span className="text-muted-foreground text-xs font-normal">
                  {selected.toLocaleDateString('en-US', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <DaySections summary={selectedSummary} onPreview={setPreview} />
        </DialogContent>
      </Dialog>

      {preview && (
        <LongPressPreviewDialog
          open={Boolean(preview)}
          onOpenChange={(v) => !v && setPreview(null)}
          title={
            <>
              <span className="flex-1 truncate">{preview.job?.title ?? '—'}</span>
              <JobIdLink jobId={preview.job?.id ?? preview.job_id} />
            </>
          }
        >
          <ReportFullPreviewBody report={preview} />
        </LongPressPreviewDialog>
      )}
    </div>
  )
}

function DaySections({
  summary,
  onPreview,
}: {
  summary: DaySummary | null
  onPreview: (report: DailyReport) => void
}) {
  const { text } = useText()
  const reports = summary?.reports ?? []

  // One accordion item per job that actually has a report for the day.
  // (If a job had multiple rows here we'd nest them, but the DB unique
  // constraint means there's at most one per (user, job, date).)
  const byJob = new Map<string, { jobTitle: string; report: DailyReport }>()
  for (const r of reports) {
    const jobId = r.job?.id ?? r.job_id
    if (byJob.has(jobId)) continue
    byJob.set(jobId, { jobTitle: r.job?.title ?? '—', report: r })
  }

  return (
    <div className="max-h-[60vh] space-y-2 overflow-y-auto">
      {byJob.size === 0 ? (
        <p className="text-muted-foreground text-xs">{text.page.reports.noReports}</p>
      ) : (
        <Accordion>
          {[...byJob.entries()].map(([jobId, { jobTitle, report }]) => (
            <DayJobItem
              key={jobId}
              job={{ id: jobId, title: jobTitle }}
              report={report}
              onPreview={onPreview}
            />
          ))}
        </Accordion>
      )}
    </div>
  )
}

// One accordion row per job that has a report on the selected day.
// Long-pressing the header opens the full-screen preview; click still toggles
// the accordion.
function DayJobItem({
  job,
  report,
  onPreview,
}: {
  job: { id: string; title: string }
  report: DailyReport
  onPreview: (r: DailyReport) => void
}) {
  const { profile } = useAuth()
  const headerLongPress = useLongPress({ onLongPress: () => onPreview(report) })

  // Show the counterpart: employee viewer sees the hirer's name, hirer viewer
  // sees the person who wrote the report.
  const isHirerViewer = profile?.role === 'hirer'
  const counterpart = isHirerViewer
    ? (report.author?.full_name ?? report.author?.email ?? null)
    : (report.job?.hirer?.full_name ?? report.job?.hirer?.email ?? null)

  return (
    <AccordionItem value={job.id}>
      <AccordionTrigger className="text-left" {...headerLongPress}>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 select-none">
          <span className="truncate text-sm font-medium">{job.title || '(untitled)'}</span>
          <JobIdLink jobId={job.id} />
          {counterpart && (
            <span className="text-muted-foreground text-xs">· {counterpart}</span>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <ReportRow report={report} onPreview={onPreview} />
      </AccordionContent>
    </AccordionItem>
  )
}

function ReportRow({
  report,
  onPreview,
}: {
  report: DailyReport
  onPreview: (r: DailyReport) => void
}) {
  const { text } = useText()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { data: edits } = useReportEdits(report.id)
  const longPress = useLongPress({ onLongPress: () => onPreview(report) })

  const isAuthor = profile?.id === report.user_id
  const [copied, setCopied] = useState(false)

  async function copyContent(e: React.MouseEvent) {
    e.stopPropagation()
    const text = report.description ?? ''
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for non-secure contexts (http on LAN, older browsers).
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.top = '-1000px'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } finally {
        document.body.removeChild(ta)
      }
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      {...longPress}
      className="bg-muted/20 cursor-pointer rounded-md border p-2 text-xs select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-muted-foreground text-[10px]">
          {new Date(report.created_at).toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        <div className="flex items-center gap-1.5">
          {report.ot_hours != null && report.ot_hours > 0 && (
            <Badge variant="outline">
              {text.page.reports.otHours}: {report.ot_hours}h
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={text.page.reports.copy}
            onClick={copyContent}
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </Button>
          {isAuthor && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={text.page.reports.edit}
              onClick={(e) => {
                e.stopPropagation()
                navigate(
                  `/reports/new?jobId=${encodeURIComponent(
                    report.job_id,
                  )}&date=${encodeURIComponent(report.report_date)}`,
                )
              }}
            >
              <Pencil className="size-3" />
            </Button>
          )}
        </div>
      </div>
      {report.description && (
        <div className="mt-1 line-clamp-4">
          <Markdown content={report.description} />
        </div>
      )}
      {edits && edits.length > 0 && (
        <p className="text-muted-foreground mt-1 text-[10px]">
          {text.page.reports.editedTimes.replace('{n}', String(edits.length))}
        </p>
      )}
    </div>
  )
}

function ReportFullPreviewBody({ report }: { report: DailyReport }) {
  const { text } = useText()
  const { data: edits } = useReportEdits(report.id)
  return (
    <>
      <Markdown content={report.description} size="base" />
      {edits && edits.length > 0 && (
        <section className="mt-6 space-y-2">
          <p className="text-sm font-medium">{text.page.reports.historyTitle}</p>
          <ul className="space-y-3">
            {edits.map((e) => (
              <EditEntry key={e.id} edit={e} />
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function EditEntry({ edit }: { edit: ReportEdit }) {
  const name = edit.editor?.full_name ?? edit.editor?.email ?? '—'
  return (
    <li className="bg-muted/30 rounded-lg border p-2 text-xs">
      <div className="mb-1 flex items-center gap-2">
        <Avatar size="sm">
          <AvatarFallback className="text-[10px]!">
            {name
              .split(/\s+/)
              .filter(Boolean)
              .map((p) => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground ml-auto">
          {new Date(edit.edited_at).toLocaleString('en-US', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      {edit.description_before != null && (
        <div className="text-destructive/80 line-through">
          <Markdown content={edit.description_before} />
        </div>
      )}
      {edit.description_after != null && (
        <div className="text-foreground mt-1">
          <Markdown content={edit.description_after} />
        </div>
      )}
    </li>
  )
}
