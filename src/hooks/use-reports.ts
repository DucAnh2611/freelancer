import {
  findExistingReport,
  listReportEdits,
  upsertReport,
  type UpsertReportInput,
} from '@/services/reports'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useUpsertReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertReportInput) => upsertReport(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({
        queryKey: ['report-existing', input.userId, input.jobId, input.reportDate],
      })
    },
  })
}

export function useExistingReport(
  userId: string | null | undefined,
  jobId: string | null | undefined,
  reportDate: string | null | undefined,
) {
  return useQuery({
    queryKey: ['report-existing', userId ?? '', jobId ?? '', reportDate ?? ''],
    queryFn: () => findExistingReport(userId as string, jobId as string, reportDate as string),
    enabled: Boolean(userId && jobId && reportDate),
  })
}

export function useReportEdits(reportId: string | null | undefined) {
  return useQuery({
    queryKey: ['report-edits', reportId ?? ''],
    queryFn: () => listReportEdits(reportId as string),
    enabled: Boolean(reportId),
  })
}
