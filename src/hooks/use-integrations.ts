import {
  getJobIntegration,
  runJobIntegration,
  type RunIntegrationInput,
} from '@/services/integrations'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useJobIntegration(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job-integration', jobId],
    queryFn: () => getJobIntegration(jobId!),
    enabled: Boolean(jobId),
    staleTime: 60_000,
  })
}

export function useRunJobIntegration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RunIntegrationInput) => runJobIntegration(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['job-integration', variables.jobId] })
      // Imported rows land in daily_reports / off_dates — invalidate the
      // ranged calendar queries so they re-pull.
      queryClient.invalidateQueries({ queryKey: ['reports', 'range'] })
      queryClient.invalidateQueries({ queryKey: ['off-dates', 'range'] })
    },
  })
}
