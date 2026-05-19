import type { Texts } from '@/constants/text'
import { createConstant } from '@/lib/constants'
import type { UserRole } from '@/types/database'
import { Briefcase, CalendarOff, ClipboardList, User, type LucideIcon } from 'lucide-react'

export type Tab = {
  to: string
  label: string
  icon: LucideIcon
}

export type FabTarget = {
  to: string
  label: string
  roles?: UserRole[]
}

export const tabs = createConstant(
  (text: Texts): Tab[] => [
    { to: '/jobs', label: text.nav.jobs, icon: Briefcase },
    { to: '/reports', label: text.nav.report, icon: ClipboardList },
    { to: '/off-days', label: text.nav.offDay, icon: CalendarOff },
    { to: '/profile', label: text.nav.me, icon: User },
  ],
)

export const fabByPath = createConstant(
  (text: Texts): Record<string, FabTarget> => ({
    '/jobs': { to: '/jobs/new', label: text.fab.newJob, roles: ['hirer'] },
    '/reports': { to: '/reports/new', label: text.fab.newReport, roles: ['employee'] },
    '/off-days': { to: '/off-days/new', label: text.fab.newOffDay, roles: ['employee'] },
  }),
)
