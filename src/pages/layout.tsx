import { BottomNav } from '@/components/bottom-nav'
import { ScrollArea } from '@/components/ui/scroll-area'
import { tabs as tabsConst } from '@/constants/nav'
import { PageHeaderProvider } from '@/contexts/page-header-context'
import { useAuth } from '@/hooks/use-auth'
import { useConstants } from '@/hooks/use-constants'
import { usePageHeader } from '@/hooks/use-page-header'
import { useSwipe } from '@/hooks/use-swipe'
import { useText } from '@/hooks/use-text'
import { cn } from '@/lib/utils'
import { useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

function LayoutInner() {
  const { profile } = useAuth()
  const { header } = usePageHeader()
  const sticky = header?.sticky ?? true
  const { text } = useText()
  const { consts } = useConstants({ tabs: tabsConst }, text)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Only allow horizontal swipe navigation between the main bottom-tab pages
  // (jobs, reports, off-days, profile). On nested routes we leave touch alone
  // so scrolling + other gestures work naturally.
  const tabIndex = consts.tabs.findIndex((t) => t.to === pathname)
  const swipeEnabled = tabIndex !== -1
  const swipe = useSwipe({
    onLeft: () => {
      if (tabIndex !== -1 && tabIndex < consts.tabs.length - 1) {
        navigate(consts.tabs[tabIndex + 1].to)
      }
    },
    onRight: () => {
      if (tabIndex > 0) navigate(consts.tabs[tabIndex - 1].to)
    },
  })

  // Track prev tab index so we can pick the slide direction. Only tab-to-tab
  // transitions animate; moving into a nested route keeps the current page
  // static to avoid jarring reshuffles.
  const prevTabIndexRef = useRef(tabIndex)
  const prev = prevTabIndexRef.current
  let transitionClass = ''
  if (tabIndex !== -1 && prev !== -1 && tabIndex !== prev) {
    transitionClass =
      tabIndex > prev
        ? 'animate-in slide-in-from-right-10 fade-in duration-200'
        : 'animate-in slide-in-from-left-10 fade-in duration-200'
  }
  prevTabIndexRef.current = tabIndex

  const headerNode = header && (
    <header className="bg-background flex items-center gap-2 border-b p-4">
      {header.leading && <div className="flex shrink-0 items-center">{header.leading}</div>}

      <div className="flex-1 truncate font-semibold">{header.title}</div>

      {header.actionGroup && (
        <div className="flex shrink-0 items-center gap-2">{header.actionGroup}</div>
      )}
    </header>
  )

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[425px] flex-col overflow-hidden sm:border-x">
      {sticky && headerNode}

      <div
        className="min-h-0 flex-1"
        {...(swipeEnabled ? swipe : {})}
      >
        <ScrollArea className="relative h-full w-full">
          {!sticky && headerNode}
          <div key={pathname} className={cn('h-full', transitionClass)}>
            <Outlet />
          </div>
        </ScrollArea>
      </div>

      {profile && tabIndex !== -1 && <BottomNav />}
    </main>
  )
}

const AppLayout = () => (
  <PageHeaderProvider>
    <LayoutInner />
  </PageHeaderProvider>
)

export default AppLayout
