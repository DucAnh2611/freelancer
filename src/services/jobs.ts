import { supabase } from '@/config/supabase'
import type { InsertTables, Tables, UpdateTables } from '@/types/database'

const JOB_SELECT = `
  id, title, description, amount, job_tax_rate, personal_tax_rate,
  hirer_rate, employee_rate, rate_type, status, cancel_reason,
  hirer_id, employee_id, metadata, created_at, updated_at, started_at,
  transferred_from_job_id, payment_day,
  work_start, work_end, lunch_start, lunch_end, working_hours,
  hirer:profiles!jobs_hirer_id_fkey(id, full_name, email),
  employee:profiles!jobs_employee_id_fkey(id, full_name, email)
`

export type ProfileRef = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'email'>

export type JobWithRelations = Tables<'jobs'> & {
  hirer: ProfileRef | null
  employee: ProfileRef | null
}

export type JobCreateInput = InsertTables<'jobs'>
export type JobUpdateInput = UpdateTables<'jobs'>

export async function getJobs(): Promise<JobWithRelations[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as JobWithRelations[]
}

// Latest clone of a job (most recent row whose transferred_from_job_id points
// at this one). Used to decide if a transferred source can be re-transferred —
// if the newest clone is cancelled, the chain is dead and we allow handing the
// source off again.
// For a list of source job ids, return the id of each source's most recent
// clone (if any). Used on the jobs list so transferred cards can link straight
// to the clone's chat without a round-trip per card.
export async function getLatestCloneIdsFor(
  sourceIds: string[],
): Promise<Record<string, string>> {
  if (sourceIds.length === 0) return {}
  const { data, error } = await supabase
    .from('jobs')
    .select('id, transferred_from_job_id, created_at')
    .in('transferred_from_job_id', sourceIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  const out: Record<string, string> = {}
  for (const row of (data ?? []) as Array<{
    id: string
    transferred_from_job_id: string | null
  }>) {
    const src = row.transferred_from_job_id
    if (src && !out[src]) out[src] = row.id
  }
  return out
}

export async function getLatestClone(sourceJobId: string): Promise<JobWithRelations | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .eq('transferred_from_job_id', sourceJobId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  const row = (data ?? [])[0]
  return (row as unknown as JobWithRelations) ?? null
}

export async function getJob(id: string): Promise<JobWithRelations> {
  const { data, error } = await supabase.from('jobs').select(JOB_SELECT).eq('id', id).single()

  if (error) throw error
  return data as unknown as JobWithRelations
}

export async function createJob(input: JobCreateInput): Promise<JobWithRelations> {
  const { data, error } = await supabase.from('jobs').insert(input).select(JOB_SELECT).single()

  if (error) throw error
  return data as unknown as JobWithRelations
}

export async function updateJob(id: string, input: JobUpdateInput): Promise<JobWithRelations> {
  const { data, error } = await supabase
    .from('jobs')
    .update(input)
    .eq('id', id)
    .select(JOB_SELECT)
    .single()

  if (error) throw error
  return data as unknown as JobWithRelations
}

export async function startJob(id: string, employeeId: string): Promise<JobWithRelations> {
  const { data, error } = await supabase
    .from('jobs')
    .update({
      status: 'started',
      employee_id: employeeId,
      started_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(JOB_SELECT)
    .single()

  if (error) throw error
  return data as unknown as JobWithRelations
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase.from('jobs').delete().eq('id', id)
  if (error) throw error
}

export async function cancelJob(id: string, reason: string): Promise<JobWithRelations> {
  const trimmed = reason.trim()
  if (!trimmed) throw new Error('Cancel reason is required')

  const { data, error } = await supabase
    .from('jobs')
    .update({ status: 'cancelled', cancel_reason: trimmed })
    .eq('id', id)
    .select(JOB_SELECT)
    .single()

  if (error) throw error
  return data as unknown as JobWithRelations
}

export type JobListItem = JobWithRelations
export type JobDetail = JobWithRelations
