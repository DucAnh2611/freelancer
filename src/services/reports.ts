import { supabase } from '@/config/supabase'
import type { ProfileRef } from '@/services/jobs'
import type { OffDateType, Tables } from '@/types/database'

export type DailyReport = Tables<'daily_reports'> & {
  job: {
    id: string
    title: string
    hirer: { id: string; full_name: string; email: string } | null
  } | null
  author: { id: string; full_name: string; email: string } | null
}

export type OffDate = Tables<'off_dates'> & {
  job: {
    id: string
    title: string
    hirer: { id: string; full_name: string; email: string } | null
  } | null
  author: { id: string; full_name: string; email: string } | null
}

const REPORT_SELECT = `
  id, job_id, user_id, description, estimate, notes, report_date,
  created_at, updated_at, ot_hours,
  job:jobs(
    id, title,
    hirer:profiles!jobs_hirer_id_fkey(id, full_name, email)
  ),
  author:profiles!daily_reports_user_id_fkey(id, full_name, email)
`

const OFF_SELECT = `
  id, job_id, user_id, title, description, type, date, created_at,
  job:jobs(
    id, title,
    hirer:profiles!jobs_hirer_id_fkey(id, full_name, email)
  ),
  author:profiles!off_dates_user_id_fkey(id, full_name, email)
`

// Fetch reports inside [from, to] inclusive. Relies on RLS to scope rows:
// authors see their own, hirers see reports on jobs they own. No explicit
// user_id filter so hirers get the full calendar for all their jobs.
export async function listReportsInRange(
  _userId: string,
  from: string,
  to: string,
): Promise<DailyReport[]> {
  const { data, error } = await supabase
    .from('daily_reports')
    .select(REPORT_SELECT)
    .gte('report_date', from)
    .lte('report_date', to)
    .order('report_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as DailyReport[]
}

export async function listOffDatesInRange(
  _userId: string,
  from: string,
  to: string,
): Promise<OffDate[]> {
  const { data, error } = await supabase
    .from('off_dates')
    .select(OFF_SELECT)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as OffDate[]
}

export type DayStatus = 'off' | 'working' | 'empty'

export type DaySummary = {
  date: string // yyyy-mm-dd
  status: DayStatus
  reports: DailyReport[]
  offDates: OffDate[]
  offType: OffDateType | null
}

// Bucket reports + off-dates by date so the calendar can paint each day and the
// day-detail dialog can list whatever fell on it.
export function bucketByDay(
  reports: DailyReport[],
  offs: OffDate[],
): Record<string, DaySummary> {
  const out: Record<string, DaySummary> = {}
  const ensure = (d: string): DaySummary => {
    if (!out[d]) {
      out[d] = { date: d, status: 'empty', reports: [], offDates: [], offType: null }
    }
    return out[d]
  }
  for (const r of reports) {
    const bucket = ensure(r.report_date)
    bucket.reports.push(r)
    if (bucket.status === 'empty') bucket.status = 'working'
  }
  for (const o of offs) {
    const bucket = ensure(o.date)
    bucket.offDates.push(o)
    bucket.status = 'off'
    bucket.offType = o.type
  }
  return out
}

export type UpsertReportInput = {
  jobId: string
  userId: string
  description: string
  reportDate: string // yyyy-mm-dd
  otHours: number
}

// Find an existing report for this (user, job, date) — the "one report per day
// per job" rule is enforced by a DB-level unique constraint too, but we look
// the row up first so the client can take the edit path when one already
// exists (and trip the edit-history trigger).
export async function findExistingReport(
  userId: string,
  jobId: string,
  reportDate: string,
): Promise<DailyReport | null> {
  const { data, error } = await supabase
    .from('daily_reports')
    .select(REPORT_SELECT)
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .eq('report_date', reportDate)
    .maybeSingle()
  if (error) throw error
  return (data as unknown as DailyReport) ?? null
}

// Create-or-edit. Creates on first write; on subsequent writes updates the
// existing row (which fires the audit trigger). Returns the resulting row.
export async function upsertReport(input: UpsertReportInput): Promise<DailyReport> {
  const existing = await findExistingReport(input.userId, input.jobId, input.reportDate)
  if (existing) {
    const { data, error } = await supabase
      .from('daily_reports')
      .update({ description: input.description, ot_hours: input.otHours })
      .eq('id', existing.id)
      .select(REPORT_SELECT)
      .single()
    if (error) throw error
    return data as unknown as DailyReport
  }
  const { data, error } = await supabase
    .from('daily_reports')
    .insert({
      job_id: input.jobId,
      user_id: input.userId,
      description: input.description,
      report_date: input.reportDate,
      ot_hours: input.otHours,
    })
    .select(REPORT_SELECT)
    .single()
  if (error) throw error
  return data as unknown as DailyReport
}

export type ReportEdit = Tables<'daily_report_edit'> & {
  editor: { id: string; full_name: string; email: string } | null
}

// --- Off days ---

export type UpsertOffDateInput = {
  jobId: string
  userId: string
  title: string
  description: string | null
  type: OffDateType
  date: string // yyyy-mm-dd
  partialOffHours: number | null
}

export async function findExistingOffDate(
  userId: string,
  jobId: string,
  date: string,
): Promise<OffDate | null> {
  const { data, error } = await supabase
    .from('off_dates')
    .select(OFF_SELECT)
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .eq('date', date)
    .maybeSingle()
  if (error) throw error
  return (data as unknown as OffDate) ?? null
}

export async function upsertOffDate(input: UpsertOffDateInput): Promise<OffDate> {
  const existing = await findExistingOffDate(input.userId, input.jobId, input.date)
  if (existing) {
    const { data, error } = await supabase
      .from('off_dates')
      .update({
        title: input.title,
        description: input.description,
        type: input.type,
        partial_off_hours: input.partialOffHours,
      })
      .eq('id', existing.id)
      .select(OFF_SELECT)
      .single()
    if (error) throw error
    return data as unknown as OffDate
  }
  const { data, error } = await supabase
    .from('off_dates')
    .insert({
      job_id: input.jobId,
      user_id: input.userId,
      title: input.title,
      description: input.description,
      type: input.type,
      date: input.date,
      partial_off_hours: input.partialOffHours,
    })
    .select(OFF_SELECT)
    .single()
  if (error) throw error
  return data as unknown as OffDate
}

export async function deleteOffDate(id: string): Promise<void> {
  const { error } = await supabase.from('off_dates').delete().eq('id', id)
  if (error) throw error
}

export async function listReportEdits(reportId: string): Promise<ReportEdit[]> {
  const { data, error } = await supabase
    .from('daily_report_edit')
    .select(
      `
      id, report_id, description_before, description_after, edited_by, edited_at,
      editor:profiles!daily_report_edit_edited_by_fkey(id, full_name, email)
      `,
    )
    .eq('report_id', reportId)
    .order('edited_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as ReportEdit[]
}

export type { ProfileRef }
