import { supabase } from '@/config/supabase'
import type { JobWithRelations, ProfileRef } from '@/services/jobs'
import type { InsertTables, Tables } from '@/types/database'

const TRANSFER_SELECT = `
  id, job_id, from_user_id, to_user_id, transferred_by, reason,
  status, new_job_id, finished_at, created_at,
  from_user:profiles!job_transfer_from_user_id_fkey(id, full_name, email),
  to_user:profiles!job_transfer_to_user_id_fkey(id, full_name, email)
`

export type TransferWithUsers = Tables<'job_transfer'> & {
  from_user: ProfileRef | null
  to_user: ProfileRef | null
}

export type TransferMessage = Tables<'transfer_message'> & {
  author: ProfileRef | null
}

export type JobTransferPreview = {
  id: string
  title: string
  status: 'idle' | 'started' | 'transferred' | 'cancelled'
  started_at: string | null
  transferred_from_job_id: string | null
  hirer_id: string
  hirer_name: string | null
  hirer_email: string | null
  employee_id: string | null
  employee_name: string | null
  employee_email: string | null
  working_hours: number | null
  payment_day: number | null
}

// Privacy preview: related users (hirer, assigned employee, transfer parties)
// can see narrow fields — title, status, who's on it — without full access.
// Backed by a SECURITY DEFINER RPC that reads the viewer from auth.uid().
export async function getJobPreviewForTransfer(jobId: string): Promise<JobTransferPreview | null> {
  // Call supabase.rpc directly so `this` stays bound to the client (detaching
  // it into a local would break the method). We only cast the result shape.
  const { data, error } = (await supabase.rpc(
    // Function name typed as `never` on the generic until types are regenerated
    // with the RPC definitions, so force-cast through unknown.
    'get_job_preview_for_transfer' as never,
    { job_uuid: jobId } as never,
  )) as unknown as {
    data: JobTransferPreview[] | null
    error: { message: string } | null
  }
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as JobTransferPreview[]
  return rows[0] ?? null
}

// Distinct profiles who have transferred a job *to the current viewer*.
// Powers the "Transferer" filter dropdown — the viewer should only see people
// who actually handed something over to them, not every employee.
export async function listTransferersToViewer(viewerId: string): Promise<ProfileRef[]> {
  const { data: rows, error } = await supabase
    .from('job_transfer')
    .select('from_user_id')
    .eq('to_user_id', viewerId)
  if (error) throw error
  const ids = Array.from(
    new Set(
      (rows ?? [])
        .map((r) => (r as { from_user_id: string | null }).from_user_id)
        .filter((v): v is string => Boolean(v)),
    ),
  )
  if (ids.length === 0) return []
  const { data: profiles, error: perr } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('id', ids)
    .order('full_name', { ascending: true })
  if (perr) throw perr
  return (profiles ?? []) as unknown as ProfileRef[]
}

// For a batch of jobs, return the `from_user_id` (transferer) of the most
// recent transfer whose *recipient* is the given viewer. Used by the jobs
// list filter to narrow by "who transferred this job to me".
export async function getTransferersToViewerByJob(
  jobIds: string[],
  viewerId: string,
): Promise<Record<string, string>> {
  if (jobIds.length === 0) return {}
  const { data, error } = await supabase
    .from('job_transfer')
    .select('job_id, new_job_id, from_user_id, created_at')
    .eq('to_user_id', viewerId)
    .or(`job_id.in.(${jobIds.join(',')}),new_job_id.in.(${jobIds.join(',')})`)
    .order('created_at', { ascending: false })
  if (error) throw error
  const out: Record<string, string> = {}
  for (const row of (data ?? []) as Array<{
    job_id: string | null
    new_job_id: string | null
    from_user_id: string
  }>) {
    if (row.job_id && !out[row.job_id]) out[row.job_id] = row.from_user_id
    if (row.new_job_id && !out[row.new_job_id]) out[row.new_job_id] = row.from_user_id
  }
  return out
}

// For a batch of source job ids, return the most recent transfer id tied to
// each (joining source_id OR new_job_id to surface the relevant chat from both
// sides). Used by the jobs list to render "Open chat" links.
export async function getTransferIdsForJobs(jobIds: string[]): Promise<Record<string, string>> {
  if (jobIds.length === 0) return {}
  const { data, error } = await supabase
    .from('job_transfer')
    .select('id, job_id, new_job_id, created_at')
    .or(`job_id.in.(${jobIds.join(',')}),new_job_id.in.(${jobIds.join(',')})`)
    .order('created_at', { ascending: false })
  if (error) throw error
  const out: Record<string, string> = {}
  for (const row of (data ?? []) as Array<{
    id: string
    job_id: string | null
    new_job_id: string | null
  }>) {
    if (row.job_id && !out[row.job_id]) out[row.job_id] = row.id
    if (row.new_job_id && !out[row.new_job_id]) out[row.new_job_id] = row.id
  }
  return out
}

export type CreateTransferInput = {
  jobId: string
  fromUserId: string
  toUserId: string
  transferredBy: string
  reason?: string | null
}

// Immediate-transfer flow: clones the job, marks the source transferred, and
// finalizes the transfer row — all in one call. Chat + handover discussion
// happen on the cloned job thereafter. There's no separate "finish" step.
export async function createTransfer(input: CreateTransferInput): Promise<{
  transfer: TransferWithUsers
  newJob: JobWithRelations
}> {
  const { data: created, error: cerr } = await supabase
    .from('job_transfer')
    .insert({
      job_id: input.jobId,
      from_user_id: input.fromUserId,
      to_user_id: input.toUserId,
      transferred_by: input.transferredBy,
      reason: input.reason ?? null,
    })
    .select(TRANSFER_SELECT)
    .single()
  if (cerr) throw cerr
  const created_ = created as unknown as TransferWithUsers

  const { data: sourceJob, error: serr } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', input.jobId)
    .single()
  if (serr) throw serr
  if (!sourceJob) throw new Error('Source job not found')

  const clonePayload: InsertTables<'jobs'> = {
    hirer_id: sourceJob.hirer_id,
    employee_id: input.toUserId === sourceJob.hirer_id ? null : input.toUserId,
    title: sourceJob.title,
    description: sourceJob.description,
    amount: sourceJob.amount,
    job_tax_rate: sourceJob.job_tax_rate,
    personal_tax_rate: sourceJob.personal_tax_rate,
    hirer_rate: sourceJob.hirer_rate,
    employee_rate: sourceJob.employee_rate,
    rate_type: sourceJob.rate_type,
    metadata: sourceJob.metadata,
    status: 'idle',
    transferred_from_job_id: sourceJob.id,
  }

  const { data: cloned, error: nerr } = await supabase
    .from('jobs')
    .insert(clonePayload)
    .select(
      `
      id, title, description, amount, job_tax_rate, personal_tax_rate,
      hirer_rate, employee_rate, rate_type, status, cancel_reason,
      hirer_id, employee_id, metadata, created_at, updated_at, started_at,
      transferred_from_job_id,
      hirer:profiles!jobs_hirer_id_fkey(id, full_name, email),
      employee:profiles!jobs_employee_id_fkey(id, full_name, email)
      `,
    )
    .single()
  if (nerr) throw nerr
  const newJob = cloned as unknown as JobWithRelations

  const { error: sourceUpdateErr } = await supabase
    .from('jobs')
    .update({ status: 'transferred' })
    .eq('id', sourceJob.id)
  if (sourceUpdateErr) throw sourceUpdateErr

  const { data: finalTransfer, error: ferr } = await supabase
    .from('job_transfer')
    .update({
      status: 'finished',
      new_job_id: newJob.id,
      finished_at: new Date().toISOString(),
    })
    .eq('id', created_.id)
    .select(TRANSFER_SELECT)
    .single()
  if (ferr) throw ferr

  return {
    transfer: finalTransfer as unknown as TransferWithUsers,
    newJob,
  }
}

// Return a transfer record tied to this job, whichever side it's on:
//   - source of a pending transfer → matches job_id (status pending)
//   - source of a finished transfer → matches job_id (status finished)
//   - clone of a finished transfer → matches new_job_id (status finished)
// Returns the most recent match so a re-transferred chain still surfaces
// the latest handover.
export async function getTransferForJob(jobId: string): Promise<TransferWithUsers | null> {
  const { data, error } = await supabase
    .from('job_transfer')
    .select(TRANSFER_SELECT)
    .or(`job_id.eq.${jobId},new_job_id.eq.${jobId}`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  const row = (data ?? [])[0]
  return (row as unknown as TransferWithUsers) ?? null
}

// All transfers touching this job — there can be two when the job is the
// middle of a chain (received via transfer T1, then re-transferred via T2).
// Ordered newest first so the UI lists the most recent handover on top.
export async function listTransfersForJob(jobId: string): Promise<TransferWithUsers[]> {
  const { data, error } = await supabase
    .from('job_transfer')
    .select(TRANSFER_SELECT)
    .or(`job_id.eq.${jobId},new_job_id.eq.${jobId}`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as TransferWithUsers[]
}

// Legacy alias — returns the transfer tied to the job regardless of status;
// the "active" label was misleading.
export const getActiveTransferForJob = getTransferForJob

export async function getTransferById(id: string): Promise<TransferWithUsers> {
  const { data, error } = await supabase
    .from('job_transfer')
    .select(TRANSFER_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as TransferWithUsers
}

// --- Chat ---

const MESSAGE_SELECT = `
  id, transfer_id, author_id, content, pinned, created_at, updated_at,
  author:profiles!transfer_message_author_id_fkey(id, full_name, email)
`

export type ListMessagesOpts = {
  before?: string
  limit?: number
  pinnedOnly?: boolean
}

// Cursor-paginated. Always fetches newest-first so the UI can prepend older
// pages onto the top of the thread as the user scrolls up.
export async function listMessages(
  transferId: string,
  opts: ListMessagesOpts = {},
): Promise<TransferMessage[]> {
  const limit = opts.limit ?? 20
  let q = supabase
    .from('transfer_message')
    .select(MESSAGE_SELECT)
    .eq('transfer_id', transferId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (opts.before) q = q.lt('created_at', opts.before)
  if (opts.pinnedOnly) q = q.eq('pinned', true)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as TransferMessage[]
}

export async function postMessage(input: {
  transferId: string
  authorId: string
  content: string
}): Promise<TransferMessage> {
  const trimmed = input.content.trim()
  if (!trimmed) throw new Error('Message cannot be empty')

  const { data, error } = await supabase
    .from('transfer_message')
    .insert({
      transfer_id: input.transferId,
      author_id: input.authorId,
      content: trimmed,
    })
    .select(MESSAGE_SELECT)
    .single()

  if (error) throw error
  return data as unknown as TransferMessage
}

export async function togglePin(messageId: string, pinned: boolean): Promise<TransferMessage> {
  const { data, error } = await supabase
    .from('transfer_message')
    .update({ pinned })
    .eq('id', messageId)
    .select(MESSAGE_SELECT)
    .single()

  if (error) throw error
  return data as unknown as TransferMessage
}

export type ReadReceipt = Tables<'transfer_message_read'>

export async function listReadReceipts(transferId: string): Promise<ReadReceipt[]> {
  const { data: messages, error: merr } = await supabase
    .from('transfer_message')
    .select('id')
    .eq('transfer_id', transferId)
  if (merr) throw merr
  const ids = (messages ?? []).map((m) => m.id)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('transfer_message_read')
    .select('message_id, user_id, read_at')
    .in('message_id', ids)
  if (error) throw error
  return (data ?? []) as ReadReceipt[]
}

export async function markMessagesRead(messageIds: string[], userId: string): Promise<void> {
  if (messageIds.length === 0) return
  const rows = messageIds.map((id) => ({ message_id: id, user_id: userId }))
  const { error } = await supabase.from('transfer_message_read').upsert(rows, {
    onConflict: 'message_id,user_id',
    ignoreDuplicates: true,
  })
  if (error) throw error
}

// Aggregate unread count per job (for the list badge). Scans jobs → transfers
// → messages not yet in transfer_message_read for the viewer.
export async function getUnreadCountsByJob(viewerId: string): Promise<Record<string, number>> {
  const { data: transfers, error: terr } = await supabase
    .from('job_transfer')
    .select('id, job_id, new_job_id')
  if (terr) throw terr

  const transferIds = (transfers ?? []).map((t) => t.id)
  if (transferIds.length === 0) return {}

  const { data: messages, error: merr } = await supabase
    .from('transfer_message')
    .select('id, transfer_id, author_id')
    .in('transfer_id', transferIds)
  if (merr) throw merr

  const msgIds = (messages ?? []).map((m) => m.id)
  if (msgIds.length === 0) return {}

  const { data: reads, error: rerr } = await supabase
    .from('transfer_message_read')
    .select('message_id')
    .eq('user_id', viewerId)
    .in('message_id', msgIds)
  if (rerr) throw rerr

  const readSet = new Set((reads ?? []).map((r) => r.message_id))
  const transferToJobs = new Map<string, string[]>()
  for (const t of transfers ?? []) {
    const jobs = [t.job_id]
    if (t.new_job_id) jobs.push(t.new_job_id)
    transferToJobs.set(t.id, jobs)
  }

  const counts: Record<string, number> = {}
  for (const m of messages ?? []) {
    if (m.author_id === viewerId) continue
    if (readSet.has(m.id)) continue
    const jobs = transferToJobs.get(m.transfer_id) ?? []
    for (const jobId of jobs) {
      counts[jobId] = (counts[jobId] ?? 0) + 1
    }
  }
  return counts
}
