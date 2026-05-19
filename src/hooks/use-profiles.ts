import { useAuth } from '@/hooks/use-auth'
import { listProfiles, type ListProfilesOptions } from '@/services/profiles'
import { useQuery } from '@tanstack/react-query'

export function useProfiles(options: ListProfilesOptions = {}) {
  const { profile } = useAuth()
  const autoExclude = options.excludeId === undefined
  const excludeId = options.excludeId ?? profile?.id

  return useQuery({
    queryKey: ['profiles', options.role ?? 'all', excludeId ?? 'none'],
    queryFn: () => listProfiles({ role: options.role, excludeId }),
    enabled: !autoExclude || Boolean(profile),
  })
}
