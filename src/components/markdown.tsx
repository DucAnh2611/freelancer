import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  content: string | null | undefined
  className?: string
  // Size tweak — `sm` for inline bubbles, `base` for full-screen previews.
  size?: 'sm' | 'base'
}

// Single place to render markdown. Pulls in remark-gfm (tables, strikethrough,
// task lists, autolinks) and the @tailwindcss/typography `prose` styles so
// headings, lists, blockquotes, and code blocks render correctly.
export function Markdown({ content, className, size = 'sm' }: Props) {
  if (!content) return null
  return (
    <div
      className={cn(
        'prose dark:prose-invert max-w-none',
        size === 'sm' ? 'prose-sm text-sm' : 'prose-base text-base',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
