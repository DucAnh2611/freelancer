import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { useAuth } from '@/hooks/use-auth'
import { useText } from '@/hooks/use-text'
import { cn } from '@/lib/utils'
import { getJobPreviewForTransfer } from '@/services/transfers'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  jobId: string
  children: React.ReactNode
}

// Privacy-preserving hover/tap preview for the counterpart of a transfer.
// Uses the get_job_preview_for_transfer RPC (SECURITY DEFINER) which only
// returns a narrow slice of fields and verifies the viewer is related.
// Hover opens it on desktop; click/tap toggles it for touch devices. The
// trigger does NOT navigate anywhere.
export function JobTransferPreviewCard({ jobId, children }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <HoverCard open={open} onOpenChange={setOpen}>
      <HoverCardTrigger
        render={
          <span
            className="cursor-pointer"
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
        <PreviewBody jobId={jobId} />
      </HoverCardContent>
    </HoverCard>
  )
}

function PreviewBody({ jobId }: { jobId: string }) {
  const { text } = useText()
  const { profile } = useAuth()
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['job-preview', jobId, profile?.id],
    queryFn: () => getJobPreviewForTransfer(jobId),
    enabled: Boolean(jobId),
  })

  if (isLoading || isFetching) {
    return <p className="text-muted-foreground text-xs">{text.page.jobs.loading}</p>
  }

  if (error) {
    return (
      <p className="text-destructive text-xs">
        {error instanceof Error ? error.message : text.page.jobs.detail.chatNoAccess}
      </p>
    )
  }

  if (!data) {
    return <p className="text-destructive text-xs">{text.page.jobs.detail.chatNoAccess}</p>
  }

  const statusLabelByStatus: Record<string, string> = {
    idle: text.page.jobs.detail.statusIdle,
    started: text.page.jobs.detail.statusStarted,
    transferred: text.page.jobs.detail.statusTransferred,
    cancelled: text.page.jobs.detail.statusCancelled,
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{data.title || '(untitled)'}</p>
          <p className="text-muted-foreground font-mono text-[10px]">#{data.id.slice(0, 8)}</p>
        </div>
        <Badge
          variant={
            data.status === 'cancelled'
              ? 'destructive'
              : data.status === 'started'
                ? 'default'
                : data.status === 'transferred'
                  ? 'secondary'
                  : 'outline'
          }
        >
          {statusLabelByStatus[data.status] ?? data.status}
        </Badge>
      </div>
      <div className="text-xs">
        <p>
          <span className="text-muted-foreground">{text.page.jobs.detail.hirer}: </span>
          {data.hirer_name ?? data.hirer_email ?? '—'}
        </p>
        <p>
          <span className="text-muted-foreground">{text.page.jobs.detail.employee}: </span>
          {data.employee_name ?? data.employee_email ?? text.page.jobs.noEmployee}
        </p>
        {data.started_at && (
          <p>
            <span className="text-muted-foreground">{text.page.jobs.detail.startedFrom}: </span>
            {new Date(data.started_at).toLocaleString('en-US', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        {data.working_hours != null && (
          <span>
            {text.page.jobs.form.fieldWorkingHours}:{' '}
            <span className="text-foreground font-medium">{data.working_hours}h</span>
          </span>
        )}
        {data.payment_day != null && (
          <span>
            {text.page.jobs.form.fieldPaymentDay}:{' '}
            <span className="text-foreground font-medium">{data.payment_day}</span>
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
