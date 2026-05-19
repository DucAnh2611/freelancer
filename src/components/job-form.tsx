import { CreateEmployeeDialog } from '@/components/create-employee-dialog'
import { LabelRequire } from '@/components/label-require'
import { SalaryPreview } from '@/components/salary-preview'
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
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { employeeItems, rateSuffix, rateTypeItems } from '@/constants/jobs'
import { useConstants } from '@/hooks/use-constants'
import { useProfiles } from '@/hooks/use-profiles'
import { useText } from '@/hooks/use-text'
import { jobFormSchema, type JobFormData } from '@/schema/jobs'
import type { RateType } from '@/types/database'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm, type UseFormReturn } from 'react-hook-form'
import { ScrollArea } from './ui/scroll-area'

export type JobFormPayload = {
  title: string
  description: string | null
  employee_id: string | null
  hirer_rate: number
  employee_rate: number
  amount: number
  job_tax_rate: number
  personal_tax_rate: number
  rate_type: RateType
  payment_day: number | null
  work_start: string
  work_end: string
  lunch_start: string | null
  lunch_end: string | null
  working_hours: number
}

// Strings come back from Postgres as `HH:MM:SS`; the <input type="time">
// expects `HH:MM`. Normalize both directions.
function toTime(v: string | null | undefined, fallback: string): string {
  if (!v) return fallback
  return v.slice(0, 5)
}

function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = eh * 60 + em - (sh * 60 + sm)
  return Math.max(0, Math.round(mins / 6) / 10) // 0.1h precision
}

function computeWorkingHours(
  workStart: string,
  workEnd: string,
  lunchStart: string | null,
  lunchEnd: string | null,
): number {
  const day = hoursBetween(workStart, workEnd)
  const lunch = lunchStart && lunchEnd ? hoursBetween(lunchStart, lunchEnd) : 0
  return Math.max(0, Math.round((day - lunch) * 10) / 10)
}

export type JobFormInitial = Partial<JobFormPayload>

export const JOB_FORM_ID = 'job-form'

type JobFormProps = {
  id?: string
  initial?: JobFormInitial
  submitError?: string | null
  employeeLocked?: boolean
  onSubmit: (payload: JobFormPayload) => Promise<void> | void
}

const AMOUNT_UNIT = 1_000_000
const AMOUNT_DECIMALS = 3
const roundTo3 = (n: number) => Math.round(n * 10 ** AMOUNT_DECIMALS) / 10 ** AMOUNT_DECIMALS

// 1..31 payment-day options for the dropdown. Values stay as strings so the
// generic SelectCombobox<T extends string> stays happy; coerced back to number
// at the field boundary.
const paymentDayItems: { value: string; label: string }[] = Array.from(
  { length: 31 },
  (_, i) => {
    const n = i + 1
    return { value: String(n), label: String(n) }
  },
)

export function JobForm({
  id = JOB_FORM_ID,
  initial,
  submitError,
  employeeLocked = false,
  onSubmit,
}: JobFormProps) {
  const { text } = useText()
  const { data: profiles } = useProfiles({ role: 'employee' })

  const { consts: schemaConsts } = useConstants({ jobFormSchema }, text)
  const { consts: rateConsts } = useConstants({ rateTypeItems }, text)
  const { consts: profileConsts } = useConstants({ employeeItems }, profiles)
  const { record: rateRecord } = useConstants({ rateSuffix })

  const form = useForm<JobFormData>({
    resolver: zodResolver(schemaConsts.jobFormSchema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      employee_id: initial?.employee_id ?? null,
      hirer_rate: initial?.hirer_rate ?? 50,
      employee_rate: initial?.employee_rate ?? 50,
      amount: roundTo3((initial?.amount ?? 0) / AMOUNT_UNIT),
      job_tax_rate: initial?.job_tax_rate ?? 0,
      personal_tax_rate: initial?.personal_tax_rate ?? 0,
      rate_type: initial?.rate_type ?? 'hourly',
      payment_day: initial?.payment_day ?? null,
      work_start: toTime(initial?.work_start, '08:00'),
      work_end: toTime(initial?.work_end, '17:30'),
      lunch_start: initial?.lunch_start === null ? null : toTime(initial?.lunch_start, '12:00'),
      lunch_end: initial?.lunch_end === null ? null : toTime(initial?.lunch_end, '13:30'),
      working_hours: initial?.working_hours ?? 8,
    },
  })

  const [pending, setPending] = useState<JobFormData | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [createEmployeeOpen, setCreateEmployeeOpen] = useState(false)

  function handleStage(data: JobFormData) {
    setPending(data)
  }

  async function handleConfirm() {
    if (!pending) return
    setConfirming(true)
    try {
      await onSubmit({
        title: pending.title.trim(),
        description: pending.description?.trim() || null,
        employee_id: pending.employee_id,
        hirer_rate: pending.hirer_rate,
        employee_rate: pending.employee_rate,
        amount: pending.amount * AMOUNT_UNIT,
        job_tax_rate: pending.job_tax_rate,
        personal_tax_rate: pending.personal_tax_rate,
        rate_type: pending.rate_type,
        payment_day: pending.payment_day ?? null,
        work_start: pending.work_start,
        work_end: pending.work_end,
        lunch_start: pending.lunch_start,
        lunch_end: pending.lunch_end,
        working_hours: pending.working_hours,
      })
      setPending(null)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <>
      <form id={id} onSubmit={form.handleSubmit(handleStage)} className="flex h-full flex-col">
        {submitError && (
          <div className="border-destructive/50 bg-destructive/10 text-destructive mx-4 mt-4 rounded-md border p-3 text-sm">
            {submitError}
          </div>
        )}

        <Tabs defaultValue="general" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="sticky top-1 left-1 z-50 m-1 w-auto">
            <TabsTrigger value="general" className={'cursor-pointer'}>
              {text.page.jobs.form.tabGeneral}
            </TabsTrigger>
            <TabsTrigger value="payment" className={'cursor-pointer'}>
              {text.page.jobs.form.tabPayment}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="min-h-0">
            <FieldGroup className="min-h-full gap-2 p-2">
              <Controller
                control={form.control}
                name="title"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <LabelRequire htmlFor="title">{text.page.jobs.form.fieldTitle}</LabelRequire>
                    <Input id="title" autoFocus aria-invalid={fieldState.invalid} {...field} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="employee_id"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{text.page.jobs.form.fieldEmployee}</FieldLabel>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <SelectCombobox
                          items={profileConsts.employeeItems}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={text.page.jobs.form.fieldEmployeePlaceholder}
                          emptyLabel={text.page.jobs.form.fieldEmployeeEmpty}
                          showClear={!employeeLocked && Boolean(field.value)}
                          disabled={employeeLocked}
                          aria-invalid={fieldState.invalid}
                        />
                      </div>
                      {!employeeLocked && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCreateEmployeeOpen(true)}
                        >
                          <UserPlus className="size-4" />
                          {text.page.employees.newEmployee}
                        </Button>
                      )}
                    </div>
                    <FieldDescription>
                      {employeeLocked
                        ? text.page.jobs.form.employeeLockedHint
                        : text.page.jobs.form.fieldEmployeeHint}
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    <CreateEmployeeDialog
                      open={createEmployeeOpen}
                      onOpenChange={setCreateEmployeeOpen}
                      onCreated={(r) => {
                        if (r.id) field.onChange(r.id)
                      }}
                    />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="description"
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    className="flex min-h-50 flex-1 flex-col"
                  >
                    <FieldLabel htmlFor="description">
                      {text.page.jobs.form.fieldDescription}
                    </FieldLabel>
                    <Textarea
                      id="description"
                      rows={6}
                      placeholder={text.page.jobs.form.fieldDescriptionPlaceholder}
                      aria-invalid={fieldState.invalid}
                      className="min-h-125 w-full"
                      {...field}
                      value={field.value ?? ''}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </TabsContent>

          <TabsContent value="payment" className="min-h-0">
            <FieldGroup className="min-h-full gap-2 p-2">
              <div className="grid grid-cols-2 gap-3">
                <Controller
                  control={form.control}
                  name="hirer_rate"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <LabelRequire htmlFor="hirer_rate">
                        {text.page.jobs.form.fieldHirerRate}
                      </LabelRequire>
                      <Input
                        id="hirer_rate"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        max={100}
                        aria-invalid={fieldState.invalid}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value === 0 ? '' : field.value}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault()
                        }}
                        onChange={(e) => {
                          const raw = e.target.valueAsNumber
                          const v = Math.min(100, Math.max(0, Number.isNaN(raw) ? 0 : raw))
                          field.onChange(v)
                          form.setValue('employee_rate', 100 - v, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="employee_rate"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="employee_rate">
                        {text.page.jobs.form.fieldEmployeeRate}
                      </FieldLabel>
                      <Input
                        id="employee_rate"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        disabled
                        readOnly
                        aria-invalid={fieldState.invalid}
                        name={field.name}
                        ref={field.ref}
                        value={field.value}
                      />
                      <FieldDescription>
                        {text.page.jobs.form.fieldEmployeeRateHint}
                      </FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Controller
                  control={form.control}
                  name="amount"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <LabelRequire htmlFor="amount">
                        {text.page.jobs.form.fieldAmount}
                      </LabelRequire>
                      <InputGroup>
                        <InputGroupInput
                          id="amount"
                          type="number"
                          inputMode="decimal"
                          step="0.001"
                          min={0.001}
                          aria-invalid={fieldState.invalid}
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={field.value === 0 ? '' : field.value}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault()
                          }}
                          onChange={(e) => {
                            const raw = e.target.valueAsNumber
                            field.onChange(Number.isNaN(raw) ? 0 : roundTo3(Math.max(0, raw)))
                          }}
                        />
                        <InputGroupAddon align="inline-end">.000.000 VND</InputGroupAddon>
                      </InputGroup>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="payment_day"
                  render={({ field }) => (
                    <Field className="w-32">
                      <FieldLabel>{text.page.jobs.form.fieldPaymentDay}</FieldLabel>
                      <SelectCombobox
                        items={paymentDayItems}
                        value={field.value != null ? String(field.value) : null}
                        onChange={(v) => field.onChange(v ? Number(v) : null)}
                        placeholder="—"
                        showClear={field.value != null}
                      />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Controller
                  control={form.control}
                  name="job_tax_rate"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="job_tax_rate">
                        {text.page.jobs.form.fieldJobTaxRate}
                      </FieldLabel>
                      <Input
                        id="job_tax_rate"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        max={100}
                        aria-invalid={fieldState.invalid}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value === 0 ? '' : field.value}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault()
                        }}
                        onChange={(e) => {
                          const raw = e.target.valueAsNumber
                          const v = Math.min(100, Math.max(0, Number.isNaN(raw) ? 0 : raw))
                          field.onChange(v)
                        }}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="personal_tax_rate"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="personal_tax_rate">
                        {text.page.jobs.form.fieldPersonalTaxRate}
                      </FieldLabel>
                      <Input
                        id="personal_tax_rate"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        max={100}
                        aria-invalid={fieldState.invalid}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value === 0 ? '' : field.value}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault()
                        }}
                        onChange={(e) => {
                          const raw = e.target.valueAsNumber
                          const v = Math.min(100, Math.max(0, Number.isNaN(raw) ? 0 : raw))
                          field.onChange(v)
                        }}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="rate_type"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <LabelRequire>{text.page.jobs.form.fieldRateType}</LabelRequire>
                    <SelectCombobox
                      items={rateConsts.rateTypeItems}
                      value={field.value}
                      onChange={(v) => field.onChange(v ?? 'monthly')}
                      placeholder={text.page.jobs.form.fieldRateTypePlaceholder}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <WorkHoursBlock form={form} />

              <SalaryPreview
                input={{
                  amount: (form.watch('amount') || 0) * AMOUNT_UNIT,
                  hirerRatePct: form.watch('hirer_rate') || 0,
                  employeeRatePct: form.watch('employee_rate') || 0,
                  jobTaxPct: form.watch('job_tax_rate') || 0,
                  personalTaxPct: form.watch('personal_tax_rate') || 0,
                }}
                rateSuffix={rateRecord('rateSuffix').get(form.watch('rate_type'), '')}
              />
            </FieldGroup>
          </TabsContent>
        </Tabs>
      </form>

      <AlertDialog open={Boolean(pending)} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{text.page.jobs.form.confirmSaveTitle}</AlertDialogTitle>
            <AlertDialogDescription>{text.page.jobs.form.confirmSaveDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          {pending && (
            <ScrollArea className="max-h-125 pr-1">
              <div className="space-y-3">
                <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                  <span>
                    {text.page.jobs.form.fieldWorkingHours}:{' '}
                    <span className="text-foreground font-medium">
                      {pending.working_hours}h
                    </span>
                  </span>
                  {pending.payment_day != null && (
                    <span>
                      {text.page.jobs.form.fieldPaymentDay}:{' '}
                      <span className="text-foreground font-medium">
                        {pending.payment_day}
                      </span>
                    </span>
                  )}
                </div>
                <SalaryPreview
                  showTitle={false}
                  rateSuffix={rateRecord('rateSuffix').get(pending.rate_type, '')}
                  input={{
                    amount: (pending.amount || 0) * AMOUNT_UNIT,
                    hirerRatePct: pending.hirer_rate || 0,
                    employeeRatePct: pending.employee_rate || 0,
                    jobTaxPct: pending.job_tax_rate || 0,
                    personalTaxPct: pending.personal_tax_rate || 0,
                  }}
                />
              </div>
            </ScrollArea>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming}>
              {text.page.jobs.form.confirmSaveCancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={confirming}>
              {confirming ? text.page.jobs.form.saving : text.page.jobs.form.confirmSaveAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Time-range block for a job's paid working window. Mutates `working_hours`
// in the form whenever any of the four time inputs change, so it stays in
// sync and the user can't forget to recalc it.
function WorkHoursBlock({ form }: { form: UseFormReturn<JobFormData> }) {
  const { text } = useText()
  const [workStart, workEnd, lunchStart, lunchEnd] = form.watch([
    'work_start',
    'work_end',
    'lunch_start',
    'lunch_end',
  ])
  const workingHours = computeWorkingHours(
    workStart ?? '08:00',
    workEnd ?? '17:30',
    lunchStart,
    lunchEnd,
  )

  useEffect(() => {
    form.setValue('working_hours', workingHours, { shouldDirty: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingHours])

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {text.page.jobs.form.workHoursSection}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Controller
          control={form.control}
          name="work_start"
          render={({ field }) => (
            <Field>
              <LabelRequire>{text.page.jobs.form.fieldWorkStart}</LabelRequire>
              <Input type="time" {...field} value={field.value ?? ''} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="work_end"
          render={({ field }) => (
            <Field>
              <LabelRequire>{text.page.jobs.form.fieldWorkEnd}</LabelRequire>
              <Input type="time" {...field} value={field.value ?? ''} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="lunch_start"
          render={({ field }) => (
            <Field>
              <FieldLabel>{text.page.jobs.form.fieldLunchStart}</FieldLabel>
              <Input
                type="time"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value || null)}
                onBlur={field.onBlur}
                name={field.name}
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="lunch_end"
          render={({ field }) => (
            <Field>
              <FieldLabel>{text.page.jobs.form.fieldLunchEnd}</FieldLabel>
              <Input
                type="time"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value || null)}
                onBlur={field.onBlur}
                name={field.name}
              />
            </Field>
          )}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        {text.page.jobs.form.fieldWorkingHours}:{' '}
        <span className="text-foreground font-medium">{workingHours}h</span>
      </p>
    </div>
  )
}
