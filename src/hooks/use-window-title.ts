import { texts } from '@/constants/text'
import { when } from '@/lib/helpers'
import { useEffect } from 'react'

export function useWindowTitle(title?: string) {
  useEffect(() => {
    const appName = texts.app.name
    document.title = when(title, `${title} — ${appName}`, appName)
  }, [title])
}
