import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useText } from '@/hooks/use-text'
import type { IntegrationSummary, JobIntegration } from '@/services/integrations'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  integration: JobIntegration
}

export function JobIntegrationResultDialog({ open, onOpenChange, integration }: Props) {
  const { text } = useText()
  const summary = (integration.summary ?? {
    reports: [],
    offDates: [],
  }) as IntegrationSummary
  const reports = summary.reports ?? []
  const offDates = summary.offDates ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85dvh] w-[95dvw] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b p-4">
          <DialogTitle>{text.page.jobs.detail.integrateResultTitle}</DialogTitle>
          <p className="text-muted-foreground text-xs">
            {text.page.jobs.detail.integrateResultAt}:{' '}
            {new Date(integration.performed_at).toLocaleString('en-US')}
          </p>
          <p className="text-muted-foreground pt-1 text-xs">
            {text.page.jobs.detail.integrateResultCounts
              .replace('{rOk}', String(integration.reports_imported))
              .replace('{rFail}', String(integration.reports_failed))
              .replace('{oOk}', String(integration.off_dates_imported))
              .replace('{oFail}', String(integration.off_dates_failed))}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-xs">
          <Section title={text.page.jobs.detail.integrateTabReports} rows={reports} />
          <Section title={text.page.jobs.detail.integrateTabOffs} rows={offDates} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({
  title,
  rows,
}: {
  title: string
  rows: IntegrationSummary['reports']
}) {
  if (rows.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-[10px] font-medium uppercase">{title}</p>
      <ul className="divide-border divide-y rounded-lg border">
        {rows.map((r, i) => (
          <li key={`${r.date}-${i}`} className="flex items-center gap-2 p-2">
            <Badge
              variant={r.ok ? 'default' : 'destructive'}
              className="h-4 px-1 text-[9px]"
            >
              {r.ok ? 'OK' : 'FAIL'}
            </Badge>
            <span className="font-mono">{r.date}</span>
            {!r.ok && r.error && (
              <span className="text-destructive flex-1 truncate">{r.error}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
