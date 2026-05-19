import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LongPressPreviewDialog } from '@/components/long-press-preview-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
import { useLongPress } from '@/hooks/use-long-press'
import { usePolling } from '@/hooks/use-polling'
import { useText } from '@/hooks/use-text'
import { useTransferRealtime } from '@/hooks/use-transfer-realtime'
import {
  useMarkMessagesRead,
  useMessages,
  usePinnedMessages,
  usePostMessage,
  useTogglePin,
} from '@/hooks/use-transfers'
import { cn } from '@/lib/utils'
import { listReadReceipts, type TransferMessage } from '@/services/transfers'
import { useQuery } from '@tanstack/react-query'
import { Pin, PinOff, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Markdown } from '@/components/markdown'

type ChatThreadProps = {
  transferId: string
  participantIds: string[]
  // Kept for API stability; pin permission is now flat for all participants.
  canPin?: boolean
}

export function ChatThread({ transferId, participantIds }: ChatThreadProps) {
  const { text } = useText()
  const { profile } = useAuth()
  const viewerId = profile?.id ?? null

  useTransferRealtime(transferId, viewerId)

  const messagesQuery = useMessages(transferId)
  const pinnedQuery = usePinnedMessages(transferId)

  const receiptsQuery = useQuery({
    queryKey: ['transfer', transferId, 'read'],
    queryFn: () => listReadReceipts(transferId),
    enabled: Boolean(transferId),
  })
  const receipts = receiptsQuery.data

  const postMessage = usePostMessage(transferId)
  const togglePin = useTogglePin(transferId)
  const markRead = useMarkMessagesRead(transferId)

  const [draft, setDraft] = useState('')
  const [previewMessage, setPreviewMessage] = useState<TransferMessage | null>(null)

  // Pages come back newest-first; flatten and reverse so the UI reads oldest→newest
  // and the "top of the list" corresponds to the oldest loaded message.
  const allMessages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? []
    return pages
      .flatMap((p) => p)
      .slice()
      .reverse()
  }, [messagesQuery.data])

  const allPinned = useMemo(() => {
    const pages = pinnedQuery.data?.pages ?? []
    return pages
      .flatMap((p) => p)
      .slice()
      .reverse()
  }, [pinnedQuery.data])

  // Adaptive poll: [1,2,5,10,15,60]s. Reset to step 0 on every new message so
  // we keep pace during bursts, then drift to 60s steady-state when quiet.
  const POLL_SCHEDULE = useMemo(() => [1, 2, 5, 10, 15, 60] as const, [])
  const resetPoll = usePolling(
    POLL_SCHEDULE,
    () => {
      messagesQuery.refetch()
      pinnedQuery.refetch()
      receiptsQuery.refetch()
    },
    Boolean(transferId),
  )

  const lastMessageCount = useRef(0)
  useEffect(() => {
    if (allMessages.length !== lastMessageCount.current) {
      lastMessageCount.current = allMessages.length
      resetPoll()
    }
  }, [allMessages.length, resetPoll])

  const readByViewer = useMemo(() => {
    if (!viewerId) return new Set<string>()
    return new Set((receipts ?? []).filter((r) => r.user_id === viewerId).map((r) => r.message_id))
  }, [receipts, viewerId])

  const firstUnreadIdx = useMemo(() => {
    if (!viewerId) return -1
    return allMessages.findIndex((m) => m.author_id !== viewerId && !readByViewer.has(m.id))
  }, [allMessages, readByViewer, viewerId])

  useEffect(() => {
    if (!viewerId) return
    const unread = allMessages
      .filter((m) => m.author_id !== viewerId && !readByViewer.has(m.id))
      .map((m) => m.id)
    if (unread.length === 0) return
    const handle = window.setTimeout(() => {
      markRead.mutate({ messageIds: unread, userId: viewerId })
    }, 600)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMessages, readByViewer, viewerId])

  async function handleSend() {
    if (!viewerId || !draft.trim()) return
    await postMessage.mutateAsync({ authorId: viewerId, content: draft })
    setDraft('')
  }

  const otherParticipants = participantIds.filter((p) => p !== viewerId)

  function renderBubble(m: TransferMessage) {
    const mine = m.author_id === viewerId
    const seenByOthers = otherParticipants.every((p) =>
      (receipts ?? []).some((r) => r.message_id === m.id && r.user_id === p),
    )
    return (
      <MessageBubble
        message={m}
        mine={mine}
        seen={mine && seenByOthers}
        onTogglePin={(pinned) => togglePin.mutate({ messageId: m.id, pinned })}
        onLongPress={() => setPreviewMessage(m)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <Tabs defaultValue="messages" className="flex min-h-0 flex-1 flex-col gap-2">
        <TabsList className="self-start">
          <TabsTrigger value="messages">{text.page.jobs.detail.chatTabMessages}</TabsTrigger>
          <TabsTrigger value="pinned">
            {text.page.jobs.detail.chatTabPinned}
            {allPinned.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {allPinned.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="min-h-0 flex-1">
          <InfiniteList
            isLoading={messagesQuery.isLoading}
            emptyLabel={text.page.jobs.detail.chatEmpty}
            items={allMessages}
            hasMore={Boolean(messagesQuery.hasNextPage)}
            isFetchingMore={messagesQuery.isFetchingNextPage}
            onLoadMore={() => messagesQuery.fetchNextPage()}
            anchorBottom
            renderItem={(m, idx) => (
              <div key={m.id}>
                {idx === firstUnreadIdx && firstUnreadIdx > 0 && (
                  <div className="text-destructive my-2 flex items-center gap-2 text-[10px] font-medium uppercase">
                    <span className="bg-destructive/50 h-px flex-1" />
                    {text.page.jobs.detail.chatUnreadDivider}
                    <span className="bg-destructive/50 h-px flex-1" />
                  </div>
                )}
                {renderBubble(m)}
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="pinned" className="min-h-0 flex-1">
          <InfiniteList
            isLoading={pinnedQuery.isLoading}
            emptyLabel={text.page.jobs.detail.chatEmptyPinned}
            items={allPinned}
            hasMore={Boolean(pinnedQuery.hasNextPage)}
            isFetchingMore={pinnedQuery.isFetchingNextPage}
            onLoadMore={() => pinnedQuery.fetchNextPage()}
            renderItem={(m) => <div key={m.id}>{renderBubble(m)}</div>}
          />
        </TabsContent>
      </Tabs>

      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={text.page.jobs.detail.chatPlaceholder}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim() || postMessage.isPending}
        >
          <Send className="size-4" />
          {postMessage.isPending
            ? text.page.jobs.detail.chatSending
            : text.page.jobs.detail.chatSend}
        </Button>
      </div>

      {previewMessage && (
        <LongPressPreviewDialog
          open={Boolean(previewMessage)}
          onOpenChange={(v) => !v && setPreviewMessage(null)}
          title={
            <>
              <Avatar size="sm">
                <AvatarFallback>
                  {initials(
                    previewMessage.author?.full_name ?? previewMessage.author?.email ?? '—',
                  )}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">
                {previewMessage.author?.full_name ?? previewMessage.author?.email ?? '—'}
              </span>
              <span className="text-muted-foreground text-xs font-normal">
                {formatTime(previewMessage.created_at)}
              </span>
            </>
          }
        >
          <Markdown content={previewMessage.content} size="base" />
        </LongPressPreviewDialog>
      )}
    </div>
  )
}

type InfiniteListProps = {
  isLoading: boolean
  emptyLabel: string
  items: TransferMessage[]
  hasMore: boolean
  isFetchingMore: boolean
  onLoadMore: () => void
  renderItem: (m: TransferMessage, idx: number) => React.ReactNode
  anchorBottom?: boolean
}

function InfiniteList({
  isLoading,
  emptyLabel,
  items,
  hasMore,
  isFetchingMore,
  onLoadMore,
  renderItem,
  anchorBottom,
}: InfiniteListProps) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const topSentinelRef = useRef<HTMLDivElement | null>(null)

  // Observe top sentinel — when it scrolls into view, fetch older page.
  useEffect(() => {
    const el = topSentinelRef.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingMore) {
          onLoadMore()
        }
      },
      { root: listRef.current, threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, isFetchingMore, onLoadMore])

  // Anchor to bottom on first load / new item.
  const prevLen = useRef(0)
  useEffect(() => {
    if (!anchorBottom) return
    const el = listRef.current
    if (!el) return
    const appended = items.length > prevLen.current
    if (appended) el.scrollTop = el.scrollHeight
    prevLen.current = items.length
  }, [items.length, anchorBottom])

  return (
    <div ref={listRef} className="h-full space-y-3 overflow-y-auto rounded-lg border p-3">
      {hasMore && <div ref={topSentinelRef} className="h-px" />}
      {isFetchingMore && <p className="text-muted-foreground py-1 text-center text-xs">Loading…</p>}

      {isLoading && items.length === 0 && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && items.length === 0 && (
        <p className="text-muted-foreground text-sm">{emptyLabel}</p>
      )}

      {items.map((m, idx) => renderItem(m, idx))}
    </div>
  )
}

function MessageBubble({
  message,
  mine,
  seen,
  onTogglePin,
  onLongPress,
}: {
  message: TransferMessage
  mine: boolean
  seen: boolean
  onTogglePin: (pinned: boolean) => void
  onLongPress: () => void
}) {
  const { text } = useText()
  const authorName = message.author?.full_name ?? message.author?.email ?? '—'
  const longPress = useLongPress({ onLongPress })

  return (
    <div className={cn('flex gap-2', mine ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar size="sm" className="mt-1">
        <AvatarFallback className="text-[10px]!">{initials(authorName)}</AvatarFallback>
      </Avatar>
      <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
        <div
          {...longPress}
          className={cn(
            'max-w-full rounded-md border p-3 py-2 text-sm select-none',
            'touch-manipulation',
            mine ? 'bg-primary/10 border-primary/20' : 'bg-muted/30',
          )}
        >
          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-[10px]">
            <span className="font-medium">{mine ? text.page.jobs.detail.you : authorName}</span>
            <span className="whitespace-nowrap">{formatTime(message.created_at)}</span>
            {message.pinned && (
              <Badge variant="outline" className="h-4 px-1 py-0 text-[9px]">
                <Pin className="size-2.5" />
                {text.page.jobs.detail.chatPinned}
              </Badge>
            )}
          </div>
          <Markdown content={message.content} />
        </div>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-[10px]">
          {mine && (
            <span className={cn(seen && 'text-primary')}>
              {seen ? text.page.jobs.detail.chatSeen : text.page.jobs.detail.chatSent}
            </span>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => onTogglePin(!message.pinned)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={
                    message.pinned ? text.page.jobs.detail.chatUnpin : text.page.jobs.detail.chatPin
                  }
                />
              }
            >
              {message.pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
            </TooltipTrigger>
            <TooltipContent>
              {message.pinned ? text.page.jobs.detail.chatUnpin : text.page.jobs.detail.chatPin}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
