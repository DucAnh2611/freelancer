import { buttonVariants } from '@/components/ui/button'
import { fabByPath, tabs, type FabTarget, type Tab } from '@/constants/nav'
import { useAuth } from '@/hooks/use-auth'
import { useConstants } from '@/hooks/use-constants'
import { useText } from '@/hooks/use-text'
import { when } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

export function BottomNav() {
  const { text } = useText()
  const { profile } = useAuth()
  const { pathname } = useLocation()

  const { consts } = useConstants({ tabs }, text)
  const { record } = useConstants({ fabByPath }, text)

  const candidate = record('fabByPath').get(pathname)
  const fab =
    candidate && (!candidate.roles || (profile?.role && candidate.roles.includes(profile.role)))
      ? candidate
      : undefined
  const mid = Math.floor(consts.tabs.length / 2)
  const leftTabs = consts.tabs.slice(0, mid)
  const rightTabs = consts.tabs.slice(mid)
  const totalCols = consts.tabs.length + (fab ? 1 : 0)

  return (
    <nav className="bg-background relative border-t">
      <div className="grid h-16 p-2" style={{ gridTemplateColumns: `repeat(${totalCols}, 1fr)` }}>
        {leftTabs.map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}

        {fab && <FabSlot fab={fab} />}

        {rightTabs.map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}
      </div>
    </nav>
  )
}

function TabLink({ to, label, icon: Icon }: Tab) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          buttonVariants({ variant: 'ghost' }),
          'h-full w-full flex-col gap-0.5 rounded-none px-0 text-xs',
          when(
            isActive,
            'text-primary bg-primary/10 hover:bg-primary/10 hover:text-primary rounded-md',
            'text-muted-foreground',
          ),
        )
      }
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </NavLink>
  )
}

function FabSlot({ fab }: { fab: FabTarget }) {
  return (
    <div className="flex items-center justify-center">
      <NavLink
        to={fab.to}
        aria-label={fab.label}
        className={cn(
          buttonVariants({ variant: 'default', size: 'icon' }),
          'absolute -top-5 size-14 cursor-pointer rounded-full shadow-lg',
        )}
      >
        <Plus className="size-6" />
      </NavLink>
    </div>
  )
}
