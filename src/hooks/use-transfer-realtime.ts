import { supabase } from '@/config/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

// Subscribe to chat changes for a specific transfer. On any insert/update to
// transfer_message or insert to transfer_message_read that touches this
// transfer, invalidate the related TanStack queries so ChatThread re-renders
// with fresh data. RLS already narrows the stream to rows the viewer can see.
export function useTransferRealtime(
  transferId: string | null | undefined,
  viewerId: string | null | undefined,
) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!transferId) return

    const channel = supabase
      .channel(`transfer:${transferId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transfer_message',
          filter: `transfer_id=eq.${transferId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['transfer', transferId, 'messages'] })
          if (viewerId) {
            qc.invalidateQueries({ queryKey: ['transfer', 'unread', viewerId] })
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transfer_message_read',
        },
        () => {
          // No transfer_id column to filter on, but RLS keeps this scoped.
          qc.invalidateQueries({ queryKey: ['transfer', transferId, 'read'] })
          if (viewerId) {
            qc.invalidateQueries({ queryKey: ['transfer', 'unread', viewerId] })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [transferId, viewerId, qc])
}
