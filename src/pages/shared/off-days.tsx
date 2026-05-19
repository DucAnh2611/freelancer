import { JobIdLink } from '@/components/job-id-link'
import { LongPressPreviewDialog } from '@/components/long-press-preview-dialog'
import { Markdown } from '@/components/markdown'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/use-auth'
import { useLongPress } from '@/hooks/use-long-press'
import { fmtDate, useReportsCalendar } from '@/hooks/use-reports-calendar'
import { useText } from '@/hooks/use-text'
import { useWindowTitle } from '@/hooks/use-window-title'
import { cn } from '@/lib/utils'
import type { OffDate } from '@/services/reports'
import { ChevronLeft, ChevronRight, Copy, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

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

export default function OffDaysPage() {
  const { text } = useText()
  const { profile } = useAuth()
  useWindowTitle(text.page.offDays.title)

  const [month, setMonth] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selected, setSelected] = useState<Date | null>(null)
  const [preview, setPreview] = useState<OffDate | null>(null)

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
          const key = fmtDate(d)
          const summary = summaries[key]
          const offCount = summary?.offDates.length ?? 0
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
              {inMonth && offCount > 0 && (
                <div className="mt-auto flex items-center gap-1 self-stretch">
                  <span className="bg-destructive size-1.5 rounded-full" />
                  <span className="text-muted-foreground text-[9px]">{offCount}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {isLoading && (
        <p className="text-muted-foreground p-2 text-center text-xs">…</p>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {text.page.offDays.dayDetailTitle}
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
          <OffSections offs={selectedSummary?.offDates ?? []} onPreview={setPreview} />
        </DialogContent>
      </Dialog>

      {preview && (
        <LongPressPreviewDialog
          open={Boolean(preview)}
          onOpenChange={(v) => !v && setPreview(null)}
          title={
            <>
              <span className="flex-1 truncate">{preview.title}</span>
              <Badge variant={preview.type === 'SAL' ? 'default' : 'secondary'}>
                {preview.type === 'SAL'
                  ? text.page.offDays.typeSAL
                  : text.page.offDays.typeNOT_SAL}
              </Badge>
              <JobIdLink jobId={preview.job?.id ?? preview.job_id} />
            </>
          }
        >
          <p className="text-sm font-medium">{preview.job?.title ?? '—'}</p>
          {preview.description && (
            <div className="mt-2">
              <Markdown content={preview.description} size="base" />
            </div>
          )}
        </LongPressPreviewDialog>
      )}
    </div>
  )
}

function OffSections({
  offs,
  onPreview,
}: {
  offs: OffDate[]
  onPreview: (o: OffDate) => void
}) {
  const { text } = useText()

  // One accordion item per job that has an off-date on this day. The unique
  // constraint (job, user, date) keeps this at one-per-job for a single user.
  const byJob = new Map<string, { jobTitle: string; off: OffDate }>()
  for (const o of offs) {
    const jobId = o.job?.id ?? o.job_id
    if (byJob.has(jobId)) continue
    byJob.set(jobId, { jobTitle: o.job?.title ?? '—', off: o })
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto">
      {byJob.size === 0 ? (
        <p className="text-muted-foreground text-xs">{text.page.offDays.noOffs}</p>
      ) : (
        <Accordion>
          {[...byJob.entries()].map(([jobId, { jobTitle, off }]) => (
            <DayJobItem
              key={jobId}
              job={{ id: jobId, title: jobTitle }}
              off={off}
              onPreview={onPreview}
            />
          ))}
        </Accordion>
      )}
    </div>
  )
}

function DayJobItem({
  job,
  off,
  onPreview,
}: {
  job: { id: string; title: string }
  off: OffDate
  onPreview: (o: OffDate) => void
}) {
  const { profile } = useAuth()
  const headerLongPress = useLongPress({ onLongPress: () => onPreview(off) })

  const isHirerViewer = profile?.role === 'hirer'
  const counterpart = isHirerViewer
    ? (off.author?.full_name ?? off.author?.email ?? null)
    : (off.job?.hirer?.full_name ?? off.job?.hirer?.email ?? null)

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
        <OffRow off={off} onPreview={onPreview} />
      </AccordionContent>
    </AccordionItem>
  )
}

function OffRow({
  off,
  onPreview,
}: {
  off: OffDate
  onPreview: (o: OffDate) => void
}) {
  const { text } = useText()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const longPress = useLongPress({ onLongPress: () => onPreview(off) })
  const isAuthor = profile?.id === off.user_id
  const [copied, setCopied] = useState(false)

  async function copyContent(e: React.MouseEvent) {
    e.stopPropagation()
    const text = off.description ?? off.title
    try {
      await navigator.clipboard.writeText(text)
    } catch {
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

  const typeLabel =
    off.type === 'SAL' ? text.page.offDays.typeSAL : text.page.offDays.typeNOT_SAL

  return (
    <div
      {...longPress}
      className="bg-muted/20 cursor-pointer rounded-md border p-2 text-xs select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate font-medium">{off.title}</span>
        <div className="flex items-center gap-1.5">
          <Badge variant={off.type === 'SAL' ? 'default' : 'secondary'}>{typeLabel}</Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={text.page.reports.copy}
            onClick={copyContent}
          >
            <Copy className={cn('size-3', copied && 'text-primary')} />
          </Button>
          {isAuthor && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={text.page.offDays.edit}
              onClick={(e) => {
                e.stopPropagation()
                navigate(
                  `/off-days/new?jobId=${encodeURIComponent(
                    off.job_id,
                  )}&date=${encodeURIComponent(off.date)}`,
                )
              }}
            >
              <Pencil className="size-3" />
            </Button>
          )}
        </div>
      </div>
      {off.description && (
        <p className="text-foreground mt-1 line-clamp-4 whitespace-pre-wrap">{off.description}</p>
      )}
    </div>
  )
}

