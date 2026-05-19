import type { Texts } from '@/constants/text'
import { createConstant } from '@/lib/constants'
import { z } from 'zod'

export const jobFormSchema = createConstant((text: Texts) =>
  z
    .object({
      title: z.string().min(1, text.page.jobs.form.titleRequired),
      description: z.string().nullable(),
      employee_id: z.string().nullable(),
      hirer_rate: z.number().min(0).max(100),
      employee_rate: z.number().min(0).max(100),
      amount: z.number().min(0.001, text.page.jobs.form.amountMinError),
      job_tax_rate: z.number().min(0).max(100),
      personal_tax_rate: z.number().min(0).max(100),
      rate_type: z.enum(['hourly', 'daily', 'monthly']),
      payment_day: z.number().int().min(1).max(31).nullable(),
      work_start: z.string(),
      work_end: z.string(),
      lunch_start: z.string().nullable(),
      lunch_end: z.string().nullable(),
      working_hours: z.number().min(0.1).max(24),
    })
    .refine((d) => Math.abs(d.hirer_rate + d.employee_rate - 100) < 0.01, {
      message: text.page.jobs.form.rateSumError,
      path: ['hirer_rate'],
    }),
)

export type JobFormData = z.infer<ReturnType<typeof jobFormSchema.resolve>>
