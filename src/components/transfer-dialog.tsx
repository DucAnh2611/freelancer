import { SelectCombobox } from '@/components/select-combobox'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { employeeItems } from '@/constants/jobs'
import { useConstants } from '@/hooks/use-constants'
import { useProfiles } from '@/hooks/use-profiles'
import { useText } from '@/hooks/use-text'
import { useCreateTransfer } from '@/hooks/use-transfers'
import type { JobWithRelations } from '@/services/jobs'
import { postMessage } from '@/services/transfers'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

type TransferDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: JobWithRelations
  hirerId: string
  onCreated?: (newJobId: string) => void
}

export function TransferDialog({
  open,
  onOpenChange,
  job,
  hirerId,
  onCreated,
}: TransferDialogProps) {
  const { text } = useText()
  const navigate = useNavigate()
  const { data: profiles } = useProfiles({ role: 'employee' })
  const { consts } = useConstants({ employeeItems }, profiles)

  const [assignToMe, setAssignToMe] = useState(false)
  const [newEmployeeId, setNewEmployeeId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createTransfer = useCreateTransfer()

  async function handleConfirm() {
    setError(null)
    const toUserId = assignToMe ? hirerId : newEmployeeId
    if (!toUserId) {
      setError(text.page.jobs.detail.transferPickTargetError)
      return
    }
    if (!job.employee_id) {
      setError(text.page.jobs.detail.transferPickTargetError)
      return
    }
    try {
      const { transfer, newJob } = await createTransfer.mutateAsync({
        jobId: job.id,
        fromUserId: job.employee_id,
        toUserId,
        transferredBy: hirerId,
        reason: null,
      })
      if (note.trim()) {
        await postMessage({
          transferId: transfer.id,
          authorId: hirerId,
          content: note,
        })
      }
      reset()
      onCreated?.(newJob.id)
      onOpenChange(false)
      toast.success(text.page.jobs.detail.transferredToast)
      navigate(`/jobs/${newJob.id}`, { replace: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : text.page.jobs.detail.transferFailed
      setError(msg)
      toast.error(msg)
    }
  }

  function reset() {
    setAssignToMe(false)
    setNewEmployeeId(null)
    setNote('')
    setError(null)
  }

  const items = (consts.employeeItems ?? []).filter((i) => i.value !== job.employee_id)
  const busy = createTransfer.isPending

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{text.page.jobs.detail.transferDialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {text.page.jobs.detail.transferDialogDesc}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={assignToMe} onCheckedChange={(v) => setAssignToMe(v === true)} />
            {text.page.jobs.detail.transferToMe}
          </label>

          {!assignToMe && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {text.page.jobs.detail.transferFieldEmployee}
              </label>
              <SelectCombobox
                items={items}
                value={newEmployeeId}
                onChange={setNewEmployeeId}
                placeholder={text.page.jobs.form.fieldEmployeePlaceholder}
                emptyLabel={text.page.jobs.form.fieldEmployeeEmpty}
                showClear={Boolean(newEmployeeId)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="transfer-note" className="text-sm font-medium">
              {text.page.jobs.detail.transferNote}
            </label>
            <Textarea
              id="transfer-note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={text.page.jobs.detail.transferNotePlaceholder}
              className="min-h-75"
            />
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>
            {text.page.jobs.detail.transferCancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={busy || (!assignToMe && !newEmployeeId)}
          >
            {busy ? text.page.jobs.detail.transferCreating : text.page.jobs.detail.transferConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
