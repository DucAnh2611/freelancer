import {
  createTransfer,
  getActiveTransferForJob,
  getTransferById,
  getTransferIdsForJobs,
  getTransferersToViewerByJob,
  getUnreadCountsByJob,
  listMessages,
  listTransferersToViewer,
  listTransfersForJob,
  markMessagesRead,
  postMessage,
  togglePin,
  type CreateTransferInput,
} from '@/services/transfers'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const TRANSFER_KEY = (jobId: string) => ['transfer', jobId] as const
const MESSAGES_KEY = (transferId: string) => ['transfer', transferId, 'messages'] as const
const UNREAD_KEY = (viewerId: string | null) => ['transfer', 'unread', viewerId] as const

export function useTransfer(transferId: string | undefined) {
  return useQuery({
    queryKey: ['transfer', 'by-id', transferId ?? ''],
    queryFn: () => getTransferById(transferId as string),
    enabled: Boolean(transferId),
  })
}

export function useTransfersForJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['transfer', 'all-for-job', jobId ?? ''],
    queryFn: () => listTransfersForJob(jobId as string),
    enabled: Boolean(jobId),
  })
}

export function useActiveTransfer(jobId: string | undefined) {
  return useQuery({
    queryKey: TRANSFER_KEY(jobId ?? ''),
    queryFn: () => getActiveTransferForJob(jobId as string),
    enabled: Boolean(jobId),
  })
}

export function useCreateTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTransferInput) => createTransfer(input),
    onSuccess: ({ transfer, newJob }, input) => {
      qc.invalidateQueries({ queryKey: TRANSFER_KEY(input.jobId) })
      qc.invalidateQueries({ queryKey: TRANSFER_KEY(newJob.id) })
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['jobs', transfer.job_id] })
      qc.invalidateQueries({ queryKey: ['jobs', newJob.id] })
      qc.invalidateQueries({ queryKey: ['transfer', 'unread'] })
    },
  })
}

const PAGE_SIZE = 20

// Infinite-scroll paginated; newest page first, older pages fetched on demand.
// Refreshes are driven by realtime (useTransferRealtime) + adaptive polling in
// ChatThread (usePolling). No fixed refetchInterval here.
export function useMessages(transferId: string | undefined) {
  return useInfiniteQuery({
    queryKey: MESSAGES_KEY(transferId ?? ''),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listMessages(transferId as string, { before: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPage[lastPage.length - 1].created_at,
    enabled: Boolean(transferId),
  })
}

export function usePinnedMessages(transferId: string | undefined) {
  return useInfiniteQuery({
    queryKey: [...MESSAGES_KEY(transferId ?? ''), 'pinned'] as const,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listMessages(transferId as string, {
        before: pageParam,
        limit: PAGE_SIZE,
        pinnedOnly: true,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPage[lastPage.length - 1].created_at,
    enabled: Boolean(transferId),
  })
}

export function usePostMessage(transferId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { authorId: string; content: string }) =>
      postMessage({ transferId, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MESSAGES_KEY(transferId) })
    },
  })
}

export function useTogglePin(transferId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, pinned }: { messageId: string; pinned: boolean }) =>
      togglePin(messageId, pinned),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MESSAGES_KEY(transferId) })
    },
  })
}

export function useMarkMessagesRead(transferId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messageIds, userId }: { messageIds: string[]; userId: string }) =>
      markMessagesRead(messageIds, userId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: MESSAGES_KEY(transferId) })
      qc.invalidateQueries({ queryKey: UNREAD_KEY(vars.userId) })
    },
  })
}

export function useTransferersToViewer(viewerId: string | null | undefined) {
  return useQuery({
    queryKey: ['transfer', 'transferers-to-viewer', viewerId ?? null],
    queryFn: () => listTransferersToViewer(viewerId as string),
    enabled: Boolean(viewerId),
  })
}

export function useTransferersToViewerByJob(
  jobIds: string[],
  viewerId: string | null | undefined,
) {
  const key = [...jobIds].sort().join(',')
  return useQuery({
    queryKey: ['transfer', 'transferers-to-viewer-by-job', viewerId ?? null, key],
    queryFn: () => getTransferersToViewerByJob(jobIds, viewerId as string),
    enabled: jobIds.length > 0 && Boolean(viewerId),
  })
}

export function useTransferIdsForJobs(jobIds: string[]) {
  const key = [...jobIds].sort().join(',')
  return useQuery({
    queryKey: ['transfer', 'ids-for-jobs', key],
    queryFn: () => getTransferIdsForJobs(jobIds),
    enabled: jobIds.length > 0,
  })
}

export function useUnreadCountsByJob(viewerId: string | null | undefined) {
  return useQuery({
    queryKey: UNREAD_KEY(viewerId ?? null),
    queryFn: () => getUnreadCountsByJob(viewerId as string),
    enabled: Boolean(viewerId),
    refetchInterval: 15_000,
  })
}

