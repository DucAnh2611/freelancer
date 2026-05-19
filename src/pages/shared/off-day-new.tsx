import { LabelRequire } from '@/components/label-require'
import { SelectCombobox } from '@/components/select-combobox'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { useJobs } from '@/hooks/use-jobs'
import { useExistingOffDate, useUpsertOffDate } from '@/hooks/use-off-days'
import { usePageHeader } from '@/hooks/use-page-header'
import { fmtDate } from '@/hooks/use-reports-calendar'
import { useText } from '@/hooks/use-text'
import { useWindowTitle } from '@/hooks/use-window-title'
import type { OffDateType } from '@/types/database'
import { Check, ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

const FORM_ID = 'off-day-new'

export default function OffDayNewPage() {
  const { text } = useText()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { setHeader } = usePageHeader()
  const { data: jobs } = useJobs()
  const upsert = useUpsertOffDate()

  const [searchParams] = useSearchParams()
  const [jobId, setJobId] = useState<string | null>(() => searchParams.get('jobId'))
  const date = searchParams.get('date') ?? fmtDate(new Date())
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<OffDateType>('SAL')
  const [partialHours, setPartialHours] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const { data: existing } = useExistingOffDate(profile?.id ?? null, jobId, date)
  const isEdit = Boolean(existing)
  useEffect(() => {
    if (existing) {
      setTitle(existing.title)
      setDescription(existing.description ?? '')
      setType(existing.type)
      setPartialHours(
        existing.partial_off_hours != null ? String(existing.partial_off_hours) : '',
      )
    }
  }, [existing])

  useWindowTitle(isEdit ? text.page.offDays.editTitle : text.page.offDays.newTitle)

  // Edits are locked to today's record; past/future rows are read-only.
  const today = fmtDate(new Date())
  const isOtherDay = isEdit && date !== today
  const canEditForm = !isOtherDay

  // Only running jobs accept new off-day records.
  const jobItems = (jobs ?? [])
    .filter((j) => j.status === 'started')
    .map((j) => ({
      value: j.id,
      label: `${j.title || '(untitled)'} · #${j.id.slice(0, 8)}`,
    }))

  const typeItems = [
    { value: 'SAL' as OffDateType, label: text.page.offDays.typeSAL },
    { value: 'NOT_SAL' as OffDateType, label: text.page.offDays.typeNOT_SAL },
  ]

  const isPending = upsert.isPending

  useEffect(() => {
    setHeader({
      title: isEdit ? text.page.offDays.editTitle : text.page.offDays.newTitle,
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
          {isPending ? text.page.offDays.saving : text.page.offDays.save}
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
      setError(text.page.offDays.jobRequired)
      return
    }
    if (!title.trim()) {
      setError(text.page.offDays.titleRequired)
      return
    }
    if (!profile) return
    try {
      await upsert.mutateAsync({
        jobId,
        userId: profile.id,
        title: title.trim(),
        description: description.trim() || null,
        type,
        date,
        partialOffHours: partialHours ? Number(partialHours) : null,
      })
      toast.success(text.page.offDays.saved)
      navigate('/off-days', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : text.page.offDays.saveFailed
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
            {text.page.offDays.editLockedOtherDay}
          </div>
        )}

        {!isEdit && (
          <Field>
            <LabelRequire>{text.page.offDays.fieldJob}</LabelRequire>
            <SelectCombobox
              items={jobItems}
              value={jobId}
              onChange={setJobId}
              placeholder={text.page.offDays.fieldJobPlaceholder}
              showClear={Boolean(jobId)}
            />
            {error === text.page.offDays.jobRequired && (
              <FieldError errors={[{ message: text.page.offDays.jobRequired }]} />
            )}
          </Field>
        )}

        <Field>
          <LabelRequire>{text.page.offDays.fieldType}</LabelRequire>
          <SelectCombobox
            items={typeItems}
            value={type}
            onChange={(v) => v && setType(v)}
            disabled={!canEditForm}
          />
        </Field>

        <Field>
          <LabelRequire htmlFor="off-title">{text.page.offDays.fieldTitle}</LabelRequire>
          <Input
            id="off-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={text.page.offDays.fieldTitlePlaceholder}
            disabled={!canEditForm}
          />
          {error === text.page.offDays.titleRequired && (
            <FieldError errors={[{ message: text.page.offDays.titleRequired }]} />
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="off-partial">{text.page.offDays.fieldPartialOff}</FieldLabel>
          <Input
            id="off-partial"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.5"
            value={partialHours}
            onChange={(e) => setPartialHours(e.target.value)}
            placeholder={text.page.offDays.fieldPartialOffPlaceholder}
            disabled={!canEditForm}
          />
          <p className="text-muted-foreground text-xs">
            {text.page.offDays.fieldPartialOffHint}
          </p>
        </Field>

        <Field className="flex flex-1 flex-col">
          <FieldLabel htmlFor="off-description">
            {text.page.offDays.fieldDescription}
          </FieldLabel>
          <Textarea
            id="off-description"
            rows={4}
            className="min-h-32 flex-1"
            placeholder={text.page.offDays.fieldDescriptionPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEditForm}
          />
        </Field>
      </FieldGroup>
    </form>
  )
}
