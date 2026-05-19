import { useText } from '@/hooks/use-text'
import { or } from '@/lib/helpers'
import { cn } from '@/lib/utils'

export type SalaryInput = {
  amount: number
  hirerRatePct: number
  employeeRatePct: number
  jobTaxPct: number
  personalTaxPct: number
}

export type SalaryBreakdown = {
  amount: number
  totalJobTax: number
  totalAfterJobTax: number
  totalPersonalTax: number
  totalNet: number
  hirerGross: number
  employeeGross: number
  hirerNet: number
  employeeNet: number
}

export function computeSalary(input: SalaryInput): SalaryBreakdown {
  const amount = input.amount
  const totalJobTax = amount * (input.jobTaxPct / 100)
  const totalAfterJobTax = amount - totalJobTax
  const totalPersonalTax = totalAfterJobTax * (input.personalTaxPct / 100)
  const totalNet = totalAfterJobTax - totalPersonalTax
  const hirerGross = amount * (input.hirerRatePct / 100)
  const employeeGross = amount * (input.employeeRatePct / 100)
  const hirerNet = totalNet * (input.hirerRatePct / 100)
  const employeeNet = totalNet * (input.employeeRatePct / 100)
  return {
    amount,
    totalJobTax,
    totalAfterJobTax,
    totalPersonalTax,
    totalNet,
    hirerGross,
    employeeGross,
    hirerNet,
    employeeNet,
  }
}

export function formatVND(n: number) {
  return `${Math.round(n).toLocaleString('en-US')} VND`
}

type SalaryPreviewProps = {
  input: SalaryInput
  className?: string
  showTitle?: boolean
  // Appended to every money cell so the preview reads as per-unit earnings
  // when the job is hourly/daily/monthly (e.g. "1,000,000 VND /h").
  rateSuffix?: string
}

export function SalaryPreview({
  input,
  className,
  showTitle = true,
  rateSuffix,
}: SalaryPreviewProps) {
  const { text } = useText()
  const b = computeSalary(input)
  const money = (n: number) => `${formatVND(n)}${rateSuffix ?? ''}`

  return (
    <div className={cn('space-y-3', className)}>
      {showTitle && (
        <p className="text-sm font-medium tracking-wide capitalize">
          {text.page.jobs.form.previewTitle}
        </p>
      )}

      <PreviewSection title={text.page.jobs.form.previewTaxSection}>
        <PreviewRow label={text.page.jobs.form.previewAmount} value={money(b.amount)} />
        <PreviewRow
          label={text.page.jobs.form.previewAmountJobTax}
          formula={`${formatVND(b.amount)} x ${input.jobTaxPct}%`}
          value={`- ${money(b.totalJobTax)}`}
        />
        <PreviewRow
          label={text.page.jobs.form.previewAmountPersonalTax}
          formula={`${formatVND(b.totalAfterJobTax)} x ${input.personalTaxPct}%`}
          value={`- ${money(b.totalPersonalTax)}`}
        />
        <PreviewRow
          label={text.page.jobs.form.previewAmountAfterTax}
          value={money(b.totalNet)}
          emphasized
          split
        />
      </PreviewSection>

      <PreviewSection title={text.page.jobs.form.previewHirerSection}>
        <PreviewRow
          label={text.page.jobs.form.previewGross}
          formula={`${formatVND(b.amount)} x ${input.hirerRatePct}%`}
          value={money(b.hirerGross)}
        />
        <PreviewRow
          label={text.page.jobs.form.previewNet}
          formula={`${formatVND(b.totalNet)} x ${input.hirerRatePct}%`}
          value={money(b.hirerNet)}
          emphasized
          split
        />
      </PreviewSection>

      <PreviewSection title={text.page.jobs.form.previewEmployeeSection}>
        <PreviewRow
          label={text.page.jobs.form.previewGross}
          formula={`${formatVND(b.amount)} x ${input.employeeRatePct}%`}
          value={money(b.employeeGross)}
        />
        <PreviewRow
          label={text.page.jobs.form.previewNet}
          formula={`${formatVND(b.totalNet)} x ${input.employeeRatePct}%`}
          value={money(b.employeeNet)}
          emphasized
          split
        />
      </PreviewSection>
    </div>
  )
}

function PreviewSection({
  title,
  children,
  className,
  wrapperClassName,
}: {
  title: string
  children: React.ReactNode
  className?: string
  wrapperClassName?: string
}) {
  return (
    <div className={cn('rounded-lg border p-3 text-sm', or(className, ''))}>
      <p className="mb-1.5 text-sm font-medium">{title}</p>
      <div className={or(wrapperClassName, '')}>{children}</div>
    </div>
  )
}

function PreviewRow({
  label,
  formula,
  value,
  emphasized,
  split,
}: {
  label: string
  formula?: string
  value: string
  emphasized?: boolean
  split?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-3 py-1.5',
        split && 'border-border mt-1 border-t pt-2',
      )}
    >
      <div className="flex flex-col">
        <span className={emphasized ? 'font-semibold' : 'font-normal'}>{label}</span>
        {formula && <span className="text-muted-foreground text-xs italic">{formula}</span>}
      </div>
      <span className={emphasized ? 'shrink-0 font-semibold' : 'shrink-0 font-medium'}>
        {value}
      </span>
    </div>
  )
}
