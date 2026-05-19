import {
  countActive,
  emptyFilters,
  JobsFilterDialog,
  matchesJobFilters,
  type JobFilters,
} from '@/components/jobs-filter-dialog'
import { computeSalary, formatVND as formatSalaryVND } from '@/components/salary-preview'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { rateSuffix, statusBorder } from '@/constants/jobs'
import { useAuth } from '@/hooks/use-auth'
import { useConstants } from '@/hooks/use-constants'
import { useJobs } from '@/hooks/use-jobs'
import { usePageHeader } from '@/hooks/use-page-header'
import { useText } from '@/hooks/use-text'
import {
  useTransferersToViewerByJob,
  useUnreadCountsByJob,
} from '@/hooks/use-transfers'
import { useViewerRole } from '@/hooks/use-viewer-role'
import { useWindowTitle } from '@/hooks/use-window-title'
import { or, when } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { JobListItem } from '@/services/jobs'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, Briefcase, Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export default function JobsPage() {
  const { text } = useText()
  const { profile } = useAuth()
  const { setHeader } = usePageHeader()
  const qc = useQueryClient()
  useWindowTitle(text.page.jobs.title)

  const { data, isLoading, error, isFetching, refetch } = useJobs()
  const { data: unread, isFetching: isUnreadFetching } = useUnreadCountsByJob(
    profile?.id ?? null,
  )
  const canCreate = profile?.role === 'hirer'

  const refreshing = isFetching || isUnreadFetching

  useEffect(() => {
    setHeader({
      title: text.page.jobs.title,
      actionGroup: (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  refetch()
                  qc.invalidateQueries({ queryKey: ['transfer', 'unread'] })
                }}
                disabled={refreshing}
                aria-label={text.page.jobs.refresh}
              />
            }
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
          </TooltipTrigger>
          <TooltipContent>{text.page.jobs.refresh}</TooltipContent>
        </Tooltip>
      ),
    })
    return () => setHeader(null)
  }, [setHeader, text.page.jobs.title, text.page.jobs.refresh, refetch, qc, refreshing])

  const viewerId = profile?.id ?? null

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<JobFilters>(emptyFilters)
  const [filterOpen, setFilterOpen] = useState(false)
  const activeFilterCount = countActive(filters)

  // Transferer lookup = "who transferred this job to me". Scoped to the
  // viewer so the filter matches the semantic in the dialog's dropdown.
  const allJobIds = useMemo(() => (data ?? []).map((j) => j.id), [data])
  const { data: transfererByJob } = useTransferersToViewerByJob(allJobIds, viewerId)

  const filtered = (data ?? []).filter((j) =>
    matchesJobFilters(j, search, filters, transfererByJob ?? {}),
  )

  // Working = anything not handed off. Transfer tab only lists jobs the viewer
  // transferred OUT — i.e. the source rows where the viewer is the hirer who
  // initiated the handover, or the original employee whose work was passed on.
  const working = filtered.filter((j) => j.status !== 'transferred')
  const transferring = filtered.filter(
    (j) =>
      j.status === 'transferred' && (j.hirer_id === viewerId || j.employee_id === viewerId),
  )
  const hasAny = (data?.length ?? 0) > 0
  const hasFilter = Boolean(search) || activeFilterCount > 0


  const renderList = (items: typeof working, emptyLabel: string) =>
    items.length === 0 ? (
      <p className="text-muted-foreground p-4 text-sm">{emptyLabel}</p>
    ) : (
      <InfiniteJobList
        items={items}
        viewerId={profile?.id ?? null}
        unreadBy={unread ?? {}}
      />
    )

  return (
    <div className="flex h-full flex-col">
      {isLoading && (
        <p className="text-muted-foreground p-4 text-sm">{text.page.jobs.loading}</p>
      )}

      {error && (
        <p className="text-destructive p-4 text-sm">{text.page.jobs.error}</p>
      )}

      {data && !hasAny && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Briefcase />
            </EmptyMedia>
            <EmptyTitle>{text.page.jobs.empty}</EmptyTitle>
            <EmptyDescription>{text.page.jobs.emptyDesc}</EmptyDescription>
          </EmptyHeader>
          {canCreate && (
            <EmptyContent>
              <Link to="/jobs/new" className={cn(buttonVariants({ variant: 'default' }))}>
                <Plus className="size-4" />
                {text.page.jobs.emptyAction}
              </Link>
            </EmptyContent>
          )}
        </Empty>
      )}

      {hasAny && (
        <div className="flex shrink-0 items-center gap-2 p-3">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={text.page.jobs.searchPlaceholder}
              className="pl-8"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFilterOpen(true)}
            aria-label={text.page.jobs.filters}
          >
            <SlidersHorizontal className="size-4" />
            {text.page.jobs.filters}
            {activeFilterCount > 0 && (
              <Badge variant="default" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {hasAny && canCreate && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {renderList(filtered, text.page.jobs.filterNoResults)}
        </div>
      )}

      {hasAny && !canCreate && (
        <Tabs defaultValue="working" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="mx-4">
            <TabsTrigger value="working">
              {text.page.jobs.tabWorking}
              <Badge variant="outline" className="ml-1">
                {working.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="transferring">
              {text.page.jobs.tabTransferring}
              <Badge variant="outline" className="ml-1">
                {transferring.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="working" className="min-h-0 overflow-y-auto">
            {renderList(
              working,
              hasFilter ? text.page.jobs.filterNoResults : text.page.jobs.emptyWorking,
            )}
          </TabsContent>
          <TabsContent value="transferring" className="min-h-0 overflow-y-auto">
            {renderList(
              transferring,
              hasFilter ? text.page.jobs.filterNoResults : text.page.jobs.emptyTransferring,
            )}
          </TabsContent>
        </Tabs>
      )}

      <JobsFilterDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        value={filters}
        onApply={setFilters}
      />
    </div>
  )
}

const PAGE_SIZE = 20

// Client-side infinite scroll window. We already have the full filtered list
// in memory (RLS keeps it small per user); this just grows the visible slice
// when the bottom sentinel enters the viewport.
function InfiniteJobList({
  items,
  viewerId,
  unreadBy,
}: {
  items: JobListItem[]
  viewerId: string | null
  unreadBy: Record<string, number>
}) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLLIElement | null>(null)

  // Reset the window when the filtered list shrinks/changes.
  useEffect(() => {
    setLimit(PAGE_SIZE)
  }, [items])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    if (limit >= items.length) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLimit((l) => Math.min(l + PAGE_SIZE, items.length))
        }
      },
      { threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [limit, items.length])

  const visible = items.slice(0, limit)
  const hasMore = limit < items.length

  return (
    <ul className="space-y-3 p-4">
      {visible.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          viewerId={viewerId}
          unread={unreadBy[job.id] ?? 0}
        />
      ))}
      {hasMore && <li ref={sentinelRef} className="text-muted-foreground py-2 text-center text-xs">…</li>}
    </ul>
  )
}

function JobCard({
  job,
  viewerId,
  unread,
}: {
  job: JobListItem
  viewerId: string | null
  unread: number
}) {
  const { text } = useText()
  const { record } = useConstants({ rateSuffix, statusBorder })

  const { role: viewerRole, isHirer, isEmployee } = useViewerRole(viewerId, job)

  const breakdown = computeSalary({
    amount: job.amount,
    hirerRatePct: job.hirer_rate,
    employeeRatePct: job.employee_rate,
    jobTaxPct: job.job_tax_rate,
    personalTaxPct: job.personal_tax_rate,
  })

  const { record: netRecord } = useConstants({
    netByRole: { hirer: breakdown.hirerNet, employee: breakdown.employeeNet },
  })
  const viewerNet = when(viewerRole, netRecord('netByRole').get(viewerRole!, null), null)
  const displayAmount = or(viewerNet, job.amount) as number

  return (
    <li className="space-y-1.5">
      <Link
        to={`/jobs/${job.id}`}
        className={cn(
          'hover:bg-muted/50 block rounded-lg border p-4 transition-colors',
          record('statusBorder').get(job.status, 'border-border'),
          job.status === 'transferred' && 'bg-secondary/20 opacity-80',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-2">
              {job.status === 'transferred' && (
                <ArrowLeftRight className="text-secondary-foreground size-3.5 shrink-0" />
              )}
              <h2 className="truncate font-medium">{job.title || '(untitled)'}</h2>
              {unread > 0 && (
                <Badge variant="destructive">
                  {unread} {text.page.jobs.detail.chatUnreadCount}
                </Badge>
              )}
            </div>
            <span className="text-muted-foreground font-mono text-[10px]">
              #{job.id.slice(0, 8)}
            </span>
          </div>
          <span className="shrink-0 text-right">
            <span className="font-semibold">
              {formatSalaryVND(displayAmount)}
              {record('rateSuffix').get(job.rate_type, '')}
            </span>
            {viewerNet !== null && (
              <span className="text-muted-foreground ml-1 text-[10px]">
                {text.page.jobs.form.previewNet}
              </span>
            )}
          </span>
        </div>
        <div className="mt-1 space-y-0.5 text-xs">
          <PersonLine
            role={text.page.jobs.detail.hirer}
            name={job.hirer?.full_name ?? null}
            email={job.hirer?.email ?? null}
            fallback={text.page.jobs.noEmployee}
          />
          <PersonLine
            role={text.page.jobs.detail.employee}
            name={when(job.employee, job.employee?.full_name ?? null, null) as string | null}
            email={when(job.employee, job.employee?.email ?? null, null) as string | null}
            fallback={text.page.jobs.noEmployee}
          />
        </div>
        <div className="text-muted-foreground mt-1.5 flex items-center justify-between text-xs">
          <span className="shrink-0">
            {text.page.jobs.rate}:{' '}
            <span className={cn(isHirer && 'text-primary font-semibold')}>{job.hirer_rate}%</span>
            {' / '}
            <span className={cn(isEmployee && 'text-primary font-semibold')}>
              {job.employee_rate}%
            </span>
          </span>
          <span className="shrink-0">
            {text.page.jobs.jobTax}: {job.job_tax_rate}% · {text.page.jobs.personalTax}:{' '}
            {job.personal_tax_rate}%
          </span>
        </div>
      </Link>

    </li>
  )
}

function PersonLine({
  role,
  name,
  email,
  fallback,
}: {
  role: string
  name: string | null
  email: string | null
  fallback: string
}) {
  const hasPerson = Boolean(name || email)
  return (
    <p className="text-muted-foreground truncate">
      <span className="text-foreground/70 font-medium">{role}:</span>{' '}
      {hasPerson ? (
        <>
          <span className="text-foreground">{name ?? email}</span>
          {name && email && <span className="text-muted-foreground/80"> · {email}</span>}
        </>
      ) : (
        <span className="italic">{fallback}</span>
      )}
    </p>
  )
}
