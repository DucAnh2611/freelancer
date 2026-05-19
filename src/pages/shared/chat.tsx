import { ChatThread } from '@/components/chat-thread'
import { JobIdLink } from '@/components/job-id-link'
import { Button } from '@/components/ui/button'
import { usePageHeader } from '@/hooks/use-page-header'
import { useText } from '@/hooks/use-text'
import { useTransfer } from '@/hooks/use-transfers'
import { useWindowTitle } from '@/hooks/use-window-title'
import { ChevronLeft } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

// Shared chat surface for a transfer. Both source and clone sides link here;
// RLS on job_transfer + transfer_message restricts access to users related to
// the transfer, so if the fetch fails or the viewer can't see the row we show
// a "no access" message instead of rendering the thread.
export default function ChatPage() {
  const { transferId } = useParams<{ transferId: string }>()
  const { text } = useText()
  const navigate = useNavigate()
  const { setHeader } = usePageHeader()

  useWindowTitle(text.page.jobs.detail.chatPageTitle)

  const { data: transfer, error, isLoading } = useTransfer(transferId)

  useEffect(() => {
    setHeader({
      title: text.page.jobs.detail.chatPageTitle,
      leading: (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate(-1)}
          aria-label={text.page.jobs.detail.back}
        >
          <ChevronLeft className="size-4" />
        </Button>
      ),
    })
    return () => setHeader(null)
  }, [setHeader, navigate, text])

  if (isLoading) {
    return <p className="text-muted-foreground p-4 text-sm">{text.page.jobs.loading}</p>
  }

  if (error || !transfer) {
    return <p className="text-destructive p-4 text-sm">{text.page.jobs.detail.chatNoAccess}</p>
  }

  const participantIds = [transfer.from_user_id, transfer.to_user_id].filter(
    (v): v is string => Boolean(v),
  )

  return (
    <div className="flex h-full flex-col">
      <div className="bg-muted/30 border-b p-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-muted-foreground">
            {text.page.jobs.detail.chatSourceLabel}:
          </span>
          <JobIdLink jobId={transfer.job_id} variant="transfer" />
          {transfer.new_job_id && (
            <>
              <span className="text-muted-foreground">
                {text.page.jobs.detail.chatCloneLabel}:
              </span>
              <JobIdLink jobId={transfer.new_job_id} variant="transfer" />
            </>
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          {transfer.from_user?.full_name ?? transfer.from_user?.email ?? '—'} →{' '}
          {transfer.to_user?.full_name ?? transfer.to_user?.email ?? '—'}
        </p>
        <p className="text-muted-foreground mt-0.5">
          {text.page.jobs.detail.chatTransferredAt}:{' '}
          <span className="text-foreground">
            {new Date(transfer.created_at).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </p>
      </div>
      <div className="min-h-0 flex-1 p-4">
        <ChatThread transferId={transfer.id} participantIds={participantIds} />
      </div>
    </div>
  )
}
