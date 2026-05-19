import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  children: React.ReactNode
  className?: string
}

// Shared shell for the full-screen "detail on long-press" dialogs used by
// report rows, off-day rows, and chat bubbles. Keeps the header / scrollable
// body layout identical across the app so the transition feels consistent.
export function LongPressPreviewDialog({ open, onOpenChange, title, children, className }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex max-h-[95dvh] w-[95dvw] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl [&>button]:top-3 ${className ?? ''}`}
      >
        <DialogHeader className="shrink-0 border-b p-4">
          <DialogTitle className="flex items-center gap-2 pr-8">{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
