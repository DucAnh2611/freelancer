import { JOB_FORM_ID, JobForm, type JobFormPayload } from '@/components/job-form'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
import { useCreateJob } from '@/hooks/use-jobs'
import { usePageHeader } from '@/hooks/use-page-header'
import { useText } from '@/hooks/use-text'
import { useWindowTitle } from '@/hooks/use-window-title'
import { Check, ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export default function JobNewPage() {
  const { text } = useText()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { setHeader } = usePageHeader()
  const createJob = useCreateJob()
  const [submitError, setSubmitError] = useState<string | null>(null)

  useWindowTitle(text.page.jobs.form.newTitle)

  const isPending = createJob.isPending

  useEffect(() => {
    setHeader({
      title: text.page.jobs.form.newTitle,
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
    if (!profile) return
    setSubmitError(null)
    try {
      const job = await createJob.mutateAsync({ ...payload, hirer_id: profile.id })
      toast.success(text.page.jobs.form.savedCreate)
      navigate(`/jobs/${job.id}`, { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : text.page.jobs.form.saveFailed
      setSubmitError(msg)
      toast.error(msg)
    }
  }

  return <JobForm submitError={submitError} onSubmit={handleSubmit} />
}
