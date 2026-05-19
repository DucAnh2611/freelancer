import { LabelRequire } from '@/components/label-require'
import { SelectCombobox } from '@/components/select-combobox'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { useJobs } from '@/hooks/use-jobs'
import { usePageHeader } from '@/hooks/use-page-header'
import { useExistingReport, useUpsertReport } from '@/hooks/use-reports'
import { useText } from '@/hooks/use-text'
import { useWindowTitle } from '@/hooks/use-window-title'
import { fmtDate } from '@/hooks/use-reports-calendar'
import { Check, ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

const FORM_ID = 'report-new'

export default function ReportNewPage() {
  const { text } = useText()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { setHeader } = usePageHeader()
  const { data: jobs } = useJobs()
  const upsertReport = useUpsertReport()

  const [searchParams] = useSearchParams()
  const [jobId, setJobId] = useState<string | null>(() => searchParams.get('jobId'))
  // Reports are anchored to today; edit links pass the original date through
  // so the upsert lands on the same row.
  const reportDate = searchParams.get('date') ?? fmtDate(new Date())
  const [description, setDescription] = useState('')
  const [otHours, setOtHours] = useState<string>('0')
  const [error, setError] = useState<string | null>(null)

  // Auto-switch to edit mode if this (user, job, date) already has a report.
  const { data: existing } = useExistingReport(profile?.id ?? null, jobId, reportDate)
  const isEdit = Boolean(existing)
  useEffect(() => {
    if (existing) {
      setDescription(existing.description ?? '')
      setOtHours(existing.ot_hours != null ? String(existing.ot_hours) : '0')
    }
  }, [existing])

  useWindowTitle(isEdit ? text.page.reports.editTitle : text.page.reports.newTitle)

  // Reports & off-days only make sense while the job is actively running.
  // Idle/transferred/cancelled jobs shouldn't accept new work records.
  const jobItems = (jobs ?? [])
    .filter((j) => j.status === 'started')
    .map((j) => ({
      value: j.id,
      label: `${j.title || '(untitled)'} · #${j.id.slice(0, 8)}`,
    }))

  // Edits are locked to today's record — past reports are read-only history,
  // future dates aren't a thing here. Hirers/employees loading a historical
  // row via the edit pencil land here in view-only mode.
  const selectedJob = (jobs ?? []).find((j) => j.id === jobId)
  const today = fmtDate(new Date())
  const isOtherDay = isEdit && reportDate !== today
  const canEditForm = !isOtherDay
  // OT only opens once the workday clock passes work_end.
  const canEditOt = (() => {
    if (!canEditForm) return false
    if (!selectedJob) return false
    if (reportDate !== today) return false
    const workEnd = (selectedJob.work_end ?? '17:30').slice(0, 5)
    const [eh, em] = workEnd.split(':').map(Number)
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    return nowMinutes >= eh * 60 + em
  })()

  const isPending = upsertReport.isPending

  useEffect(() => {
    setHeader({
      title: isEdit ? text.page.reports.editTitle : text.page.reports.newTitle,
      leading: (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <ChevronLeft className="size-4" />
        </Button>
      ),
      actionGroup: (
        <Button
          type="submit"
          form={FORM_ID}
          size="sm"
          disabled={isPending || !canEditForm}
        >
          <Check className="size-4" />
          {isPending ? text.page.reports.saving : text.page.reports.save}
        </Button>
      ),
    })
    return () => setHeader(null)
  }, [setHeader, navigate, text, isPending, isEdit, canEditForm])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!canEditForm) return
    if (!jobId) {
      setError(text.page.reports.jobRequired)
      return
    }
    if (!description.trim()) {
      setError(text.page.reports.descriptionRequired)
      return
    }
    if (!profile) return
    try {
      await upsertReport.mutateAsync({
        jobId,
        userId: profile.id,
        description: description.trim(),
        reportDate,
        otHours: Number(otHours) || 0,
      })
      toast.success(text.page.reports.saved)
      navigate('/reports', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : text.page.reports.saveFailed
      setError(msg)
      toast.error(msg)
    }
  }

  return (
    <form id={FORM_ID} onSubmit={handleSubmit} className="flex h-full flex-col">
      <FieldGroup className="flex-1 gap-3 p-4">
        {error && (
          <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm">
            {error}
          </div>
        )}

        {isOtherDay && (
          <div className="border-muted-foreground/30 bg-muted/40 text-muted-foreground rounded-md border p-3 text-sm">
            {text.page.reports.editLockedOtherDay}
          </div>
        )}

        {!isEdit && (
          <Field>
            <LabelRequire>{text.page.reports.fieldJob}</LabelRequire>
            <SelectCombobox
              items={jobItems}
              value={jobId}
              onChange={setJobId}
              placeholder={text.page.reports.fieldJobPlaceholder}
              showClear={Boolean(jobId)}
            />
            {error === text.page.reports.jobRequired && (
              <FieldError errors={[{ message: text.page.reports.jobRequired }]} />
            )}
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="report-ot">{text.page.reports.fieldOtHours}</FieldLabel>
          <Input
            id="report-ot"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.5"
            value={otHours}
            onChange={(e) => setOtHours(e.target.value)}
            disabled={!canEditOt}
          />
          <p className="text-muted-foreground text-xs">
            {canEditOt
              ? text.page.reports.otHoursEditable
              : text.page.reports.otHoursLocked}
          </p>
        </Field>

        <Field className="flex flex-1 flex-col">
          <LabelRequire htmlFor="report-description">
            {text.page.reports.fieldDescription}
          </LabelRequire>
          <Textarea
            id="report-description"
            rows={8}
            className="min-h-48 flex-1"
            placeholder={text.page.reports.fieldDescriptionPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEditForm}
          />
          {error === text.page.reports.descriptionRequired && (
            <FieldError errors={[{ message: text.page.reports.descriptionRequired }]} />
          )}
        </Field>
      </FieldGroup>
    </form>
  )
}
