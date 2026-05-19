import { FieldLabel } from '@/components/ui/field'
import { cn } from '@/lib/utils'

type LabelRequireProps = React.ComponentProps<typeof FieldLabel> & {
  required?: boolean
}

export function LabelRequire({
  children,
  required = true,
  className,
  ...props
}: LabelRequireProps) {
  return (
    <FieldLabel className={cn('gap-1', className)} {...props}>
      {children}
      {required && (
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      )}
    </FieldLabel>
  )
}
