import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { useAuth } from '@/hooks/use-auth'
import { useJob } from '@/hooks/use-jobs'
import { useText } from '@/hooks/use-text'
import { cn } from '@/lib/utils'
import type { JobStatus } from '@/types/database'
import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

type JobHoverCardProps = {
  jobId: string
  children: React.ReactNode
}

// Wraps a trigger (typically a "#xxxx" link) with a preview. Opens on hover
// on desktop and on click/tap for touch devices — controlled open state lets
// both mechanisms share a single popover.
export function JobHoverCard({ jobId, children }: JobHoverCardProps) {
  const [open, setOpen] = useState(false)
  return (
    <HoverCard open={open} onOpenChange={setOpen}>
      <HoverCardTrigger
        render={
          <span
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpen((o) => !o)
            }}
          >
            {children}
          </span>
        }
      />
      <HoverCardContent className="w-72">
        <JobHoverBody jobId={jobId} />
      </HoverCardContent>
    </HoverCard>
  )
}

function JobHoverBody({ jobId }: { jobId: string }) {
  const { text } = useText()
  const { profile } = useAuth()
  const { data: job, isLoading, error } = useJob(jobId)

  if (isLoading) {
    return <p className="text-muted-foreground text-xs">{text.page.jobs.loading}</p>
  }

  if (error || !job) {
    return <p className="text-destructive text-xs">{text.page.jobs.detail.notFound}</p>
  }

  const statusLabelByStatus: Record<JobStatus, string> = {
    idle: text.page.jobs.detail.statusIdle,
    started: text.page.jobs.detail.statusStarted,
    transferred: text.page.jobs.detail.statusTransferred,
    cancelled: text.page.jobs.detail.statusCancelled,
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{job.title || '(untitled)'}</p>
          <p className="text-muted-foreground font-mono text-[10px]">#{job.id.slice(0, 8)}</p>
        </div>
        <Badge
          variant={
            job.status === 'cancelled'
              ? 'destructive'
              : job.status === 'started'
                ? 'default'
                : job.status === 'transferred'
                  ? 'secondary'
                  : 'outline'
          }
        >
          {statusLabelByStatus[job.status]}
        </Badge>
      </div>
      <div className="text-xs">
        <p>
          <span className="text-muted-foreground">{text.page.jobs.detail.hirer}: </span>
          {job.hirer?.full_name ?? job.hirer?.email ?? '—'}
        </p>
        <p>
          <span className="text-muted-foreground">{text.page.jobs.detail.employee}: </span>
          {job.employee?.full_name ?? job.employee?.email ?? text.page.jobs.noEmployee}
        </p>
      </div>
      <p className="text-xs">
        <span className="text-muted-foreground">{text.page.jobs.detail.amount}: </span>
        <span className="font-medium">
          {Math.round(job.amount).toLocaleString('en-US')} VND
        </span>
      </p>
      <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span>
          {text.page.jobs.form.fieldWorkingHours}:{' '}
          <span className="text-foreground font-medium">{job.working_hours}h</span>
        </span>
        {job.payment_day != null && (
          <span>
            {text.page.jobs.form.fieldPaymentDay}:{' '}
            <span className="text-foreground font-medium">{job.payment_day}</span>
          </span>
        )}
      </div>

      {profile?.role === 'hirer' && (
        <Link
          to={`/jobs/${jobId}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full')}
        >
          <ExternalLink className="size-3.5" />
          {text.page.jobs.detail.viewDetail}
        </Link>
      )}
    </div>
  )
}
