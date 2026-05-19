import { createContext, useState, type ReactNode } from 'react'

export type PageHeaderConfig = {
  leading?: ReactNode
  title?: ReactNode
  sticky?: boolean
  actionGroup?: ReactNode
}

type PageHeaderContextValue = {
  header: PageHeaderConfig | null
  setHeader: (config: PageHeaderConfig | null) => void
}

export const PageHeaderContext = createContext<PageHeaderContextValue | undefined>(undefined)

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeaderConfig | null>(null)
  return (
    <PageHeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </PageHeaderContext.Provider>
  )
}
