import { PageHeaderContext } from '@/contexts/page-header-context'
import { useContext } from 'react'

export function usePageHeader() {
  const ctx = useContext(PageHeaderContext)
  if (!ctx) {
    throw new Error('usePageHeader must be used within a PageHeaderProvider')
  }
  return ctx
}
