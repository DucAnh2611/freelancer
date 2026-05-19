import type { Texts } from '@/constants/text'
import { createConstant } from '@/lib/constants'
import type { ProfileListItem } from '@/services/profiles'
import type { JobStatus, RateType } from '@/types/database'

export type RateTypeItem = { value: RateType; label: string }
export type EmployeeItem = { value: string; label: string }

export const rateTypeItems = createConstant(
  (text: Texts): RateTypeItem[] => [
    { value: 'hourly', label: text.page.jobs.form.rateHourly },
    { value: 'daily', label: text.page.jobs.form.rateDaily },
    { value: 'monthly', label: text.page.jobs.form.rateMonthly },
  ],
)

export const employeeItems = createConstant(
  (profiles: ProfileListItem[] | undefined): EmployeeItem[] =>
    profiles?.map((p) => ({
      value: p.id,
      label: `${p.full_name || '(no name)'} <${p.email}>`,
    })) ?? [],
)

export const rateSuffix = createConstant(
  (): Record<RateType, string> => ({
    hourly: '/h',
    daily: '/day',
    monthly: '/mo',
  }),
)

export const statusBorder = createConstant(
  (): Record<JobStatus, string> => ({
    idle: 'border-border',
    started: 'border-primary/60',
    transferred: 'border-secondary',
    cancelled: 'border-destructive/60',
  }),
)

export type ViewerRole = 'hirer' | 'employee'
