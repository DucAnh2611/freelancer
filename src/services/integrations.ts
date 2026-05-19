import { supabase } from '@/config/supabase'
import type { OffDateType, Tables } from '@/types/database'

export type IntegrationReportRow = {
  date: string // yyyy-mm-dd
  description: string
  otHours: number
}

export type IntegrationOffDateRow = {
  date: string // yyyy-mm-dd
  type: OffDateType
  title: string
  description: string | null
  partialOffHours: number | null
}

export type IntegrationRowResult = {
  date: string
  ok: boolean
  error?: string
}

export type IntegrationSummary = {
  reports: IntegrationRowResult[]
  offDates: IntegrationRowResult[]
}

export type JobIntegration = Tables<'job_integrations'>

export type RunIntegrationInput = {
  jobId: string
  userId: string // the employee rows are attributed to
  performedBy: string
  reports: IntegrationReportRow[]
  offDates: IntegrationOffDateRow[]
}

export type RunIntegrationResult = {
  integration: JobIntegration
  summary: IntegrationSummary
}

// Runs a one-shot historical import for a job. Rows are inserted individually
// so a single failing row (duplicate date, validation error) doesn't abort
// the rest — the outcome is captured per-row in the summary JSON. The
// UNIQUE(job_id) constraint on job_integrations is what enforces "one time
// only" at the DB level.
export async function runJobIntegration(
  input: RunIntegrationInput,
): Promise<RunIntegrationResult> {
  // Bail early if the job has already been integrated. The INSERT below would
  // fail with a 23505 anyway but checking up front lets us surface a clean
  // error before we try to import anything.
  const { data: existing } = await supabase
    .from('job_integrations')
    .select('id')
    .eq('job_id', input.jobId)
    .maybeSingle()
  if (existing) throw new Error('This job has already been integrated.')

  const reportResults: IntegrationRowResult[] = []
  for (const r of input.reports) {
    const { error } = await supabase.from('daily_reports').insert({
      job_id: input.jobId,
      user_id: input.userId,
      report_date: r.date,
      description: r.description,
      ot_hours: r.otHours,
    })
    reportResults.push({
      date: r.date,
      ok: !error,
      error: error?.message,
    })
  }

  const offResults: IntegrationRowResult[] = []
  for (const o of input.offDates) {
    const { error } = await supabase.from('off_dates').insert({
      job_id: input.jobId,
      user_id: input.userId,
      date: o.date,
      type: o.type,
      title: o.title,
      description: o.description,
      partial_off_hours: o.partialOffHours,
    })
    offResults.push({
      date: o.date,
      ok: !error,
      error: error?.message,
    })
  }

  const summary: IntegrationSummary = {
    reports: reportResults,
    offDates: offResults,
  }

  const { data, error } = await supabase
    .from('job_integrations')
    .insert({
      job_id: input.jobId,
      performed_by: input.performedBy,
      reports_imported: reportResults.filter((r) => r.ok).length,
      reports_failed: reportResults.filter((r) => !r.ok).length,
      off_dates_imported: offResults.filter((r) => r.ok).length,
      off_dates_failed: offResults.filter((r) => !r.ok).length,
      summary: summary as unknown as never,
    })
    .select()
    .single()
  if (error) throw error

  return { integration: data as JobIntegration, summary }
}

export async function getJobIntegration(jobId: string): Promise<JobIntegration | null> {
  const { data, error } = await supabase
    .from('job_integrations')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle()
  if (error) throw error
  return (data as JobIntegration) ?? null
}
