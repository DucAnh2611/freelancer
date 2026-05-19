import { SelectCombobox } from '@/components/select-combobox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { employeeItems, rateTypeItems } from '@/constants/jobs'
import { useConstants } from '@/hooks/use-constants'
import { useProfiles } from '@/hooks/use-profiles'
import { useText } from '@/hooks/use-text'
import { useAuth } from '@/hooks/use-auth'
import { useTransferersToViewer } from '@/hooks/use-transfers'
import type { ProfileListItem } from '@/services/profiles'
import type { JobStatus, RateType } from '@/types/database'
import { useState } from 'react'

export type JobFilters = {
  statuses: JobStatus[]
  rateTypes: RateType[]
  hirerId: string | null
  transfererId: string | null
  amountMin: string
  amountMax: string
}

export const emptyFilters: JobFilters = {
  statuses: [],
  rateTypes: [],
  hirerId: null,
  transfererId: null,
  amountMin: '',
  amountMax: '',
}

export function countActive(f: JobFilters): number {
  let n = 0
  if (f.statuses.length > 0) n++
  if (f.rateTypes.length > 0) n++
  if (f.hirerId) n++
  if (f.transfererId) n++
  if (f.amountMin) n++
  if (f.amountMax) n++
  return n
}

const ALL_STATUSES: JobStatus[] = ['idle', 'started', 'transferred', 'cancelled']

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: JobFilters
  onApply: (next: JobFilters) => void
}

export function JobsFilterDialog({ open, onOpenChange, value, onApply }: Props) {
  const { text } = useText()
  const [draft, setDraft] = useState<JobFilters>(value)

  const { profile } = useAuth()
  const { data: hirers } = useProfiles({ role: 'hirer' })
  // Transferer options: the people who handed a job *to me*. Narrower than
  // "anyone who's ever transferred" — matches the semantic the user asked for.
  const { data: transferers } = useTransferersToViewer(profile?.id ?? null)
  const { consts: rateConsts } = useConstants({ rateTypeItems }, text)
  const { consts: hirerConsts } = useConstants({ employeeItems }, hirers)
  const { consts: transfererConsts } = useConstants(
    { employeeItems },
    transferers as ProfileListItem[] | undefined,
  )

  const statusLabelByStatus: Record<JobStatus, string> = {
    idle: text.page.jobs.detail.statusIdle,
    started: text.page.jobs.detail.statusStarted,
    transferred: text.page.jobs.detail.statusTransferred,
    cancelled: text.page.jobs.detail.statusCancelled,
  }

  function toggleStatus(s: JobStatus, checked: boolean) {
    setDraft((d) => ({
      ...d,
      statuses: checked ? [...d.statuses, s] : d.statuses.filter((v) => v !== s),
    }))
  }

  function toggleRate(r: RateType, checked: boolean) {
    setDraft((d) => ({
      ...d,
      rateTypes: checked ? [...d.rateTypes, r] : d.rateTypes.filter((v) => v !== r),
    }))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setDraft(value) // snapshot current on open
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{text.page.jobs.filters}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{text.page.jobs.filterStatus}</p>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={draft.statuses.includes(s)}
                    onCheckedChange={(v) => toggleStatus(s, v === true)}
                  />
                  {statusLabelByStatus[s]}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">{text.page.jobs.filterRateType}</p>
            <div className="flex flex-wrap gap-2">
              {rateConsts.rateTypeItems.map((item) => (
                <label key={item.value} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={draft.rateTypes.includes(item.value)}
                    onCheckedChange={(v) => toggleRate(item.value, v === true)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">{text.page.jobs.filterHirer}</p>
            <SelectCombobox
              items={hirerConsts.employeeItems}
              value={draft.hirerId}
              onChange={(v) => setDraft((d) => ({ ...d, hirerId: v }))}
              placeholder={text.page.jobs.form.fieldEmployeePlaceholder}
              emptyLabel={text.page.jobs.form.fieldEmployeeEmpty}
              showClear={Boolean(draft.hirerId)}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">{text.page.jobs.filterTransferer}</p>
            <SelectCombobox
              items={transfererConsts.employeeItems}
              value={draft.transfererId}
              onChange={(v) => setDraft((d) => ({ ...d, transfererId: v }))}
              placeholder={text.page.jobs.form.fieldEmployeePlaceholder}
              emptyLabel={text.page.jobs.form.fieldEmployeeEmpty}
              showClear={Boolean(draft.transfererId)}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">{text.page.jobs.filterAmount}</p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder={text.page.jobs.filterAmountMin}
                value={draft.amountMin}
                onChange={(e) => setDraft((d) => ({ ...d, amountMin: e.target.value }))}
              />
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder={text.page.jobs.filterAmountMax}
                value={draft.amountMax}
                onChange={(e) => setDraft((d) => ({ ...d, amountMax: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => setDraft(emptyFilters)}>
            {text.page.jobs.filterClear}
          </Button>
          <Button
            type="button"
            onClick={() => {
              onApply(draft)
              onOpenChange(false)
            }}
          >
            {text.page.jobs.filterApply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type JobLike = {
  id: string
  title: string
  description: string | null
  status: JobStatus
  rate_type: RateType
  hirer_id: string
  amount: number
}

// Apply search + filters to a job row. Text match is case-insensitive across
// title and description; empty/unset filters match everything. `transfererByJob`
// maps job id → from_user_id of the relevant transfer, used to filter by the
// person who initiated the handoff.
export function matchesJobFilters(
  job: JobLike,
  search: string,
  f: JobFilters,
  transfererByJob: Record<string, string> = {},
): boolean {
  const q = search.trim().toLowerCase()
  if (q) {
    const hay = `${job.title ?? ''} ${job.description ?? ''}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  if (f.statuses.length > 0 && !f.statuses.includes(job.status)) return false
  if (f.rateTypes.length > 0 && !f.rateTypes.includes(job.rate_type)) return false
  if (f.hirerId && job.hirer_id !== f.hirerId) return false
  if (f.transfererId && transfererByJob[job.id] !== f.transfererId) return false
  const min = f.amountMin ? Number(f.amountMin) : null
  const max = f.amountMax ? Number(f.amountMax) : null
  if (min != null && !Number.isNaN(min) && job.amount < min) return false
  if (max != null && !Number.isNaN(max) && job.amount > max) return false
  return true
}
