import { JOB_FORM_ID, JobForm, type JobFormPayload } from '@/components/job-form'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useJob, useUpdateJob } from '@/hooks/use-jobs'
import { usePageHeader } from '@/hooks/use-page-header'
import { useText } from '@/hooks/use-text'
import { useWindowTitle } from '@/hooks/use-window-title'
import { Check, ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

export default function JobEditPage() {
  const { id } = useParams<{ id: string }>()
  const { text } = useText()
  const navigate = useNavigate()
  const { setHeader } = usePageHeader()
  const { data: job, isLoading, error } = useJob(id)
  const updateJob = useUpdateJob(id ?? '')
  const [submitError, setSubmitError] = useState<string | null>(null)

  useWindowTitle(text.page.jobs.form.editTitle)

  const isPending = updateJob.isPending

  useEffect(() => {
    setHeader({
      title: text.page.jobs.form.editTitle,
      leading: (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate(-1)}
          aria-label={text.page.jobs.detail.back}
        >
          <ChevronLeft className="size-4" />
        </Button>
      ),
      actionGroup: (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="submit"
                form={JOB_FORM_ID}
                size="sm"
                disabled={isPending}
                aria-label={text.page.jobs.form.save}
              />
            }
          >
            <Check className="size-4" />
            {isPending ? text.page.jobs.form.saving : text.page.jobs.form.save}
          </TooltipTrigger>
          <TooltipContent>{text.page.jobs.form.save}</TooltipContent>
        </Tooltip>
      ),
    })
    return () => setHeader(null)
  }, [setHeader, navigate, isPending, text])

  async function handleSubmit(payload: JobFormPayload) {
    setSubmitError(null)
    try {
      await updateJob.mutateAsync(payload)
      toast.success(text.page.jobs.form.savedUpdate)
      navigate(`/jobs/${id}`, { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : text.page.jobs.form.saveFailed
      setSubmitError(msg)
      toast.error(msg)
    }
  }

  if (isLoading) {
    return <p className="text-muted-foreground p-6 text-sm">{text.page.jobs.loading}</p>
  }

  if (error || !job) {
    return <p className="text-destructive p-6 text-sm">{text.page.jobs.detail.notFound}</p>
  }

  return (
    <JobForm
      initial={{
        title: job.title,
        description: job.description,
        employee_id: job.employee_id,
        hirer_rate: job.hirer_rate,
        employee_rate: job.employee_rate,
        amount: job.amount,
        job_tax_rate: job.job_tax_rate,
        personal_tax_rate: job.personal_tax_rate,
        rate_type: job.rate_type,
        payment_day: job.payment_day,
      }}
      employeeLocked={job.status === 'started'}
      submitError={submitError}
      onSubmit={handleSubmit}
    />
  )
}
