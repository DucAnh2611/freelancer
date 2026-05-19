import {
  cancelJob,
  createJob,
  deleteJob,
  getJob,
  getJobs,
  getLatestClone,
  getLatestCloneIdsFor,
  startJob,
  updateJob,
  type JobCreateInput,
  type JobUpdateInput,
} from '@/services/jobs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const JOBS_KEY = ['jobs'] as const
const jobKey = (id: string) => ['jobs', id] as const

export function useJobs() {
  return useQuery({
    queryKey: JOBS_KEY,
    queryFn: getJobs,
  })
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: jobKey(id ?? ''),
    queryFn: () => getJob(id as string),
    enabled: Boolean(id),
  })
}

export function useLatestClone(sourceJobId: string | undefined) {
  return useQuery({
    queryKey: ['jobs', sourceJobId ?? '', 'latest-clone'],
    queryFn: () => getLatestClone(sourceJobId as string),
    enabled: Boolean(sourceJobId),
  })
}

export function useLatestCloneIdsFor(sourceIds: string[]) {
  const key = [...sourceIds].sort().join(',')
  return useQuery({
    queryKey: ['jobs', 'latest-clones', key],
    queryFn: () => getLatestCloneIdsFor(sourceIds),
    enabled: sourceIds.length > 0,
  })
}

export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: JobCreateInput) => createJob(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOBS_KEY })
    },
  })
}

export function useUpdateJob(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: JobUpdateInput) => updateJob(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOBS_KEY })
      qc.invalidateQueries({ queryKey: jobKey(id) })
    },
  })
}

export function useStartJob(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (employeeId: string) => startJob(id, employeeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOBS_KEY })
      qc.invalidateQueries({ queryKey: jobKey(id) })
    },
  })
}

export function useDeleteJob(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => deleteJob(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOBS_KEY })
      qc.removeQueries({ queryKey: jobKey(id) })
    },
  })
}

export function useCancelJob(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) => cancelJob(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOBS_KEY })
      qc.invalidateQueries({ queryKey: jobKey(id) })
    },
  })
}
