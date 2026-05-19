import { JobHoverCard } from '@/components/job-hover-card'
import { JobTransferPreviewCard } from '@/components/job-transfer-preview-card'
import { cn } from '@/lib/utils'

type Props = {
  jobId: string
  // `self` (default) — viewer has regular RLS access to the job; uses the full
  // useJob-backed preview. `transfer` — viewer is a counterpart who can only
  // see the narrow SECURITY DEFINER preview.
  variant?: 'self' | 'transfer'
  className?: string
}

// Shared "#xxxxxxxx" trigger that opens a job preview on hover (desktop) or
// click/tap (mobile). The preview wrappers own click handling — don't attach
// any onClick here or it would eat the trigger's toggle before it fires.
// Propagation to parent clickables is stopped inside the wrappers already.
export function JobIdLink({ jobId, variant = 'self', className }: Props) {
  const Wrapper = variant === 'transfer' ? JobTransferPreviewCard : JobHoverCard
  return (
    <Wrapper jobId={jobId}>
      <span
        className={cn(
          'text-primary cursor-pointer font-mono text-xs underline underline-offset-2',
          className,
        )}
      >
        #{jobId.slice(0, 8)}
      </span>
    </Wrapper>
  )
}
