import { JobIdLink } from '@/components/job-id-link'
import { JobIntegrationDialog } from '@/components/job-integration-dialog'
import { JobIntegrationResultDialog } from '@/components/job-integration-result-dialog'
import { JobPaymentDialog } from '@/components/job-payment-dialog'
import { SalaryPreview } from '@/components/salary-preview'
import { SelectCombobox } from '@/components/select-combobox'
import { TransferDialog } from '@/components/transfer-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { employeeItems, rateSuffix } from '@/constants/jobs'
import { useAuth } from '@/hooks/use-auth'
import { useConstants } from '@/hooks/use-constants'
import { useJobIntegration } from '@/hooks/use-integrations'
import { useCancelJob, useDeleteJob, useJob, useLatestClone, useStartJob } from '@/hooks/use-jobs'
import { usePageHeader } from '@/hooks/use-page-header'
import { useProfiles } from '@/hooks/use-profiles'
import { useText } from '@/hooks/use-text'
import { useActiveTransfer, useTransfersForJob } from '@/hooks/use-transfers'
import { useViewerRole } from '@/hooks/use-viewer-role'
import { useWindowTitle } from '@/hooks/use-window-title'
import { cn } from '@/lib/utils'
import {
  ArrowLeftRight,
  Ban,
  Calculator,
  ChevronLeft,
  Database,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

function formatVND(n: number) {
  return `${Math.round(n).toLocaleString('en-US')} VND`
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { text } = useText()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { setHeader } = usePageHeader()
  const { data: profiles } = useProfiles({ role: 'employee' })
  const { consts: profileConsts } = useConstants({ employeeItems }, profiles)
  const { record } = useConstants({ rateSuffix })

  useWindowTitle(text.page.jobs.detail.title)

  const { data: job, isLoading, error } = useJob(id)
  const cancelMutation = useCancelJob(id ?? '')
  const deleteMutation = useDeleteJob(id ?? '')
  const startMutation = useStartJob(id ?? '')

  const { isHirer } = useViewerRole(profile?.id ?? null, job ?? null)
  const isIdle = job?.status === 'idle'
  const isStarted = job?.status === 'started'
  const isCancelled = job?.status === 'cancelled'
  const isTransferred = job?.status === 'transferred'
  const canEdit = Boolean(job && isHirer && isIdle)
  const canStart = Boolean(job && isHirer && isIdle)

  const { data: transfer } = useActiveTransfer(id)
  // Mid-chain jobs (A→B→C) are touched by two transfer rows — one as clone
  // side (received), one as source side (sent on). List them all so each gets
  // its own Open-team-chat entry point.
  const { data: transfers } = useTransfersForJob(id)
  const [transferOpen, setTransferOpen] = useState(false)

  // For a source that's already `transferred`, only allow a re-transfer once
  // every downstream clone row has been deleted. Any surviving clone (idle,
  // started, transferred, or even cancelled) still counts as a handover and
  // keeps the source locked.
  const { data: latestClone } = useLatestClone(isTransferred ? id : undefined)
  const chainDead = isTransferred && !latestClone
  const canOpenTransfer = Boolean(job && isHirer && (isStarted || (isTransferred && chainDead)))

  // Whenever a transfer record is tied to this job (source OR clone side),
  // the viewer can jump into the shared chat page. RLS already filters who
  // can actually see messages, so we use `transfer` as a proxy for "has chat".
  const allTransfers = transfers ?? []
  const canOpenTeamChat = allTransfers.length > 0 || Boolean(transfer)

  const [startOpen, setStartOpen] = useState(false)
  const [startEmployeeId, setStartEmployeeId] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [integrateOpen, setIntegrateOpen] = useState(false)
  const [integrateResultOpen, setIntegrateResultOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    setHeader({
      title: text.page.jobs.detail.title,
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

  const canCancel = Boolean(isHirer && !isCancelled && !isTransferred && job)
  const canDelete = Boolean(isHirer && isIdle)
  // Payment calc is read-only and useful to both parties once the job has an
  // employee attached — works for started, transferred, and cancelled jobs.
  const canCalcPayment = Boolean(job?.employee_id)
  // One-shot historical import. Hirer-only, gated on status=`started`: an
  // idle job has no history worth backfilling, and transferred/cancelled are
  // closed books. Employee is guaranteed by the `started` status since Start
  // requires picking one.
  const { data: integration } = useJobIntegration(id)
  const canIntegrate = Boolean(isHirer && !integration && isStarted)
  const canViewIntegration = Boolean(isHirer && integration)
  const hasAnyAction =
    canEdit ||
    canStart ||
    canOpenTransfer ||
    canCancel ||
    canDelete ||
    canOpenTeamChat ||
    canCalcPayment ||
    canIntegrate ||
    canViewIntegration

  async function handleDelete() {
    setDeleteError(null)
    try {
      await deleteMutation.mutateAsync()
      setDeleteOpen(false)
      toast.success(text.page.jobs.detail.deletedToast)
      navigate('/jobs', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : text.page.jobs.detail.deleteFailed
      setDeleteError(msg)
      toast.error(msg)
    }
  }

  function openStart() {
    setStartError(null)
    setStartEmployeeId(job?.employee_id ?? null)
    setStartOpen(true)
  }

  async function handleStart() {
    if (!startEmployeeId) {
      setStartError(text.page.jobs.detail.startNeedEmployeeDesc)
      return
    }
    setStartError(null)
    try {
      await startMutation.mutateAsync(startEmployeeId)
      setStartOpen(false)
      toast.success(text.page.jobs.detail.startedToast)
    } catch (err) {
      const msg = err instanceof Error ? err.message : text.page.jobs.detail.startFailed
      setStartError(msg)
      toast.error(msg)
    }
  }

  function openCancel() {
    setCancelError(null)
    setCancelReason('')
    setCancelOpen(true)
  }

  async function handleCancel() {
    const reason = cancelReason.trim()
    if (!reason) {
      setCancelError(text.page.jobs.detail.cancelReasonRequired)
      return
    }
    setCancelError(null)
    try {
      await cancelMutation.mutateAsync(reason)
      setCancelOpen(false)
      toast.success(text.page.jobs.detail.cancelledToast)
    } catch (err) {
      const msg = err instanceof Error ? err.message : text.page.jobs.detail.cancelFailed
      setCancelError(msg)
      toast.error(msg)
    }
  }

  const statusLabelByStatus: Record<string, string> = {
    idle: text.page.jobs.detail.statusIdle,
    started: text.page.jobs.detail.statusStarted,
    transferred: text.page.jobs.detail.statusTransferred,
    cancelled: text.page.jobs.detail.statusCancelled,
  }
  const statusLabel = job ? (statusLabelByStatus[job.status] ?? '') : ''

  const jobBody = job && (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-xl font-bold">{job.title || '(untitled)'}</h2>
          <span className="text-muted-foreground font-mono text-xs">#{job.id.slice(0, 8)}</span>
        </div>
        <Badge
          variant={
            isCancelled
              ? 'destructive'
              : isStarted
                ? 'default'
                : isTransferred
                  ? 'secondary'
                  : 'outline'
          }
        >
          {statusLabel}
        </Badge>
      </div>

      {isStarted && job.started_at && (
        <p className="text-xs">
          <span className="font-medium">{text.page.jobs.detail.startedFrom}:</span>{' '}
          <span className="text-muted-foreground">{formatDateTime(job.started_at)}</span>
        </p>
      )}

      {job.transferred_from_job_id && (
        <p className="text-xs">
          <span className="font-medium">{text.page.jobs.detail.transferFromLabel}:</span>{' '}
          <JobIdLink jobId={job.transferred_from_job_id} variant="transfer" />
        </p>
      )}

      {isTransferred && transfer?.new_job_id && (
        <div className="bg-secondary/40 flex items-start gap-2 rounded-lg border p-3 text-xs">
          <ArrowLeftRight className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <p className="font-medium">{text.page.jobs.detail.transferredCallout}</p>
            <p>
              <span className="text-muted-foreground">
                {text.page.jobs.detail.transferToLabel}:
              </span>{' '}
              <JobIdLink jobId={transfer.new_job_id} variant="transfer" />
            </p>
          </div>
        </div>
      )}

      <dl className="divide-border divide-y rounded-lg border">
        <DetailRow label={text.page.jobs.form.fieldHirerRate}>{job.hirer_rate}%</DetailRow>
        <DetailRow label={text.page.jobs.form.fieldEmployeeRate}>{job.employee_rate}%</DetailRow>
        <DetailRow label={text.page.jobs.detail.amount}>
          {formatVND(job.amount)}
          {record('rateSuffix').get(job.rate_type, '')}
        </DetailRow>
        <DetailRow label={text.page.jobs.form.fieldJobTaxRate}>{job.job_tax_rate}%</DetailRow>
        <DetailRow label={text.page.jobs.form.fieldPersonalTaxRate}>
          {job.personal_tax_rate}%
        </DetailRow>
        {job.payment_day != null && (
          <DetailRow label={text.page.jobs.form.fieldPaymentDay}>
            Day {job.payment_day}
          </DetailRow>
        )}
      </dl>

      <div className="space-y-1 text-sm">
        <PersonRow
          role={text.page.jobs.detail.hirer}
          name={isHirer ? text.page.jobs.detail.you : (job.hirer?.full_name ?? null)}
          email={job.hirer?.email ?? null}
          fallback={text.page.jobs.noEmployee}
        />
        <PersonRow
          role={text.page.jobs.detail.employee}
          name={job.employee?.full_name ?? null}
          email={job.employee?.email ?? null}
          fallback={text.page.jobs.noEmployee}
        />
      </div>

      {job.description && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium">
            {text.page.jobs.detail.description}
          </p>
          <div className="bg-muted/50 rounded-lg border p-3 text-sm whitespace-pre-wrap">
            {job.description}
          </div>
        </div>
      )}

      {isCancelled && job.cancel_reason && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium">
            {text.page.jobs.detail.cancelReason}
          </p>
          <div className="bg-muted/50 rounded-lg border p-3 text-sm">{job.cancel_reason}</div>
        </div>
      )}

      <SalaryPreview
        input={{
          amount: job.amount,
          hirerRatePct: job.hirer_rate,
          employeeRatePct: job.employee_rate,
          jobTaxPct: job.job_tax_rate,
          personalTaxPct: job.personal_tax_rate,
        }}
        rateSuffix={record('rateSuffix').get(job.rate_type, '')}
      />
    </>
  )

  return (
    <div className="flex h-full flex-col">
      {isLoading && <p className="text-muted-foreground p-4 text-sm">{text.page.jobs.loading}</p>}
      {error && <p className="text-destructive p-4 text-sm">{text.page.jobs.detail.notFound}</p>}

      {job && <div className="flex-1 space-y-4 overflow-y-auto p-4">{jobBody}</div>}

      {job && hasAnyAction && (
        <div className="bg-background/95 flex shrink-0 items-center gap-2 border-t p-2 supports-backdrop-filter:backdrop-blur">
          {/* Primary lane: the one action that moves the job forward right now. */}
          <div className="flex flex-1 items-center gap-2">
            {canStart && (
              <Button type="button" size="sm" className="flex-1" onClick={openStart}>
                <Play className="size-4" />
                {text.page.jobs.detail.start}
              </Button>
            )}
            {allTransfers.length === 1 && (
              <Link
                to={`/chat/${allTransfers[0].id}`}
                className={cn(buttonVariants({ size: 'sm' }), 'flex-1')}
              >
                <MessageSquare className="size-4" />
                {text.page.jobs.detail.openTeamChat}
              </Link>
            )}
            {allTransfers.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button type="button" size="sm" className="flex-1" />}
                >
                  <MessageSquare className="size-4" />
                  {text.page.jobs.detail.openTeamChat}
                  <Badge variant="secondary" className="ml-1">
                    {allTransfers.length}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  {allTransfers.map((t) => {
                    const counterpartId =
                      t.job_id === job?.id ? t.new_job_id : t.job_id
                    const counterpartName =
                      t.job_id === job?.id
                        ? (t.to_user?.full_name ?? t.to_user?.email ?? '—')
                        : (t.from_user?.full_name ?? t.from_user?.email ?? '—')
                    return (
                      <DropdownMenuItem
                        key={t.id}
                        onClick={() => navigate(`/chat/${t.id}`)}
                      >
                        <MessageSquare className="size-3.5" />
                        <span className="flex-1 truncate">{counterpartName}</span>
                        {counterpartId && (
                          <span className="text-muted-foreground font-mono text-[10px]">
                            #{counterpartId.slice(0, 8)}
                          </span>
                        )}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {canCalcPayment && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentOpen(true)}
              >
                <Calculator className="size-4" />
                {text.page.jobs.detail.calcPayment}
              </Button>
            )}
          </div>

          {/* Secondary / destructive lane: collapsed into an overflow menu so
              the primary lane breathes. Edit + Transfer + Integrate are safe,
              Cancel & Delete aren't — split them with a separator for weight. */}
          {(canEdit ||
            canOpenTransfer ||
            canIntegrate ||
            canViewIntegration ||
            canCancel ||
            canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="More actions"
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                {canEdit && (
                  <DropdownMenuItem onClick={() => navigate(`/jobs/${id}/edit`)}>
                    <Pencil className="size-3.5" />
                    {text.page.jobs.detail.edit}
                  </DropdownMenuItem>
                )}
                {canOpenTransfer && (
                  <DropdownMenuItem onClick={() => setTransferOpen(true)}>
                    <ArrowLeftRight className="size-3.5" />
                    {text.page.jobs.detail.transfer}
                  </DropdownMenuItem>
                )}
                {canIntegrate && (
                  <DropdownMenuItem onClick={() => setIntegrateOpen(true)}>
                    <Database className="size-3.5" />
                    {text.page.jobs.detail.integrate}
                  </DropdownMenuItem>
                )}
                {canViewIntegration && (
                  <DropdownMenuItem onClick={() => setIntegrateResultOpen(true)}>
                    <Database className="size-3.5" />
                    {text.page.jobs.detail.integrateView}
                  </DropdownMenuItem>
                )}
                {(canCancel || canDelete) &&
                  (canEdit || canOpenTransfer || canIntegrate || canViewIntegration) && (
                    <DropdownMenuSeparator />
                  )}
                {canCancel && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={openCancel}
                    disabled={cancelMutation.isPending}
                  >
                    <Ban className="size-3.5" />
                    {text.page.jobs.detail.cancel}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      setDeleteError(null)
                      setDeleteOpen(true)
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5" />
                    {text.page.jobs.detail.delete}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      <AlertDialog open={startOpen} onOpenChange={setStartOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {startEmployeeId
                ? text.page.jobs.detail.startConfirmTitle
                : text.page.jobs.detail.startNeedEmployeeTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {startEmployeeId
                ? text.page.jobs.detail.startConfirmDesc
                : text.page.jobs.detail.startNeedEmployeeDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">{text.page.jobs.form.fieldEmployee}</label>
            <SelectCombobox
              items={profileConsts.employeeItems}
              value={startEmployeeId}
              onChange={setStartEmployeeId}
              placeholder={text.page.jobs.form.fieldEmployeePlaceholder}
              emptyLabel={text.page.jobs.form.fieldEmployeeEmpty}
              showClear={Boolean(startEmployeeId)}
            />
            {startError && <p className="text-destructive text-xs">{startError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={startMutation.isPending}>
              {text.page.jobs.detail.startCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStart}
              disabled={!startEmployeeId || startMutation.isPending}
            >
              {startMutation.isPending
                ? text.page.jobs.detail.starting
                : text.page.jobs.detail.startConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{text.page.jobs.detail.cancelConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {text.page.jobs.detail.cancelConfirmDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label htmlFor="cancel-reason" className="text-sm font-medium">
              {text.page.jobs.detail.cancelReason}
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <Textarea
              id="cancel-reason"
              rows={4}
              autoFocus
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={text.page.jobs.detail.cancelReasonPlaceholder}
              aria-invalid={Boolean(cancelError)}
            />
            {cancelError && <p className="text-destructive text-xs">{cancelError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              {text.page.jobs.detail.cancelKeep}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason.trim() || cancelMutation.isPending}
            >
              {cancelMutation.isPending
                ? text.page.jobs.detail.cancelling
                : text.page.jobs.detail.cancelConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{text.page.jobs.detail.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {text.page.jobs.detail.deleteConfirmDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-destructive text-xs">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {text.page.jobs.detail.deleteKeep}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? text.page.jobs.detail.deleting
                : text.page.jobs.detail.deleteConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {job && profile && (
        <TransferDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          job={job}
          hirerId={job.hirer_id}
        />
      )}

      {job && (
        <JobPaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} job={job} />
      )}

      {job && canIntegrate && (
        <JobIntegrationDialog
          open={integrateOpen}
          onOpenChange={setIntegrateOpen}
          job={job}
        />
      )}

      {integration && (
        <JobIntegrationResultDialog
          open={integrateResultOpen}
          onOpenChange={setIntegrateResultOpen}
          integration={integration}
        />
      )}
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  )
}

function PersonRow({
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
    <p className="leading-snug">
      <span className="text-muted-foreground">{role}: </span>
      {hasPerson ? (
        <>
          <span className="font-medium">{name ?? email}</span>
          {name && email && <span className="text-muted-foreground ml-1 text-xs">· {email}</span>}
        </>
      ) : (
        <span className="text-muted-foreground italic">{fallback}</span>
      )}
    </p>
  )
}
