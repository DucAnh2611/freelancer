import type { ViewerRole } from '@/constants/jobs'

type JobLike = { hirer_id: string; employee_id: string | null }

type ViewerRoleResult = {
  role: ViewerRole | null
  isHirer: boolean
  isEmployee: boolean
}

export function useViewerRole(
  viewerId: string | null | undefined,
  job: JobLike | null | undefined,
): ViewerRoleResult {
  let role: ViewerRole | null = null
  if (viewerId && job) {
    if (viewerId === job.hirer_id) role = 'hirer'
    else if (viewerId === job.employee_id) role = 'employee'
  }
  return {
    role,
    isHirer: role === 'hirer',
    isEmployee: role === 'employee',
  }
}
