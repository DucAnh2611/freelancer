import {
  deleteOffDate,
  findExistingOffDate,
  upsertOffDate,
  type UpsertOffDateInput,
} from '@/services/reports'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useUpsertOffDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertOffDateInput) => upsertOffDate(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['off-dates'] })
      qc.invalidateQueries({
        queryKey: ['off-date-existing', input.userId, input.jobId, input.date],
      })
    },
  })
}

export function useDeleteOffDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteOffDate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['off-dates'] })
    },
  })
}

export function useExistingOffDate(
  userId: string | null | undefined,
  jobId: string | null | undefined,
  date: string | null | undefined,
) {
  return useQuery({
    queryKey: ['off-date-existing', userId ?? '', jobId ?? '', date ?? ''],
    queryFn: () => findExistingOffDate(userId as string, jobId as string, date as string),
    enabled: Boolean(userId && jobId && date),
  })
}
