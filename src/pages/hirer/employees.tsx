import { CreateEmployeeDialog } from '@/components/create-employee-dialog'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { usePageHeader } from '@/hooks/use-page-header'
import { useProfiles } from '@/hooks/use-profiles'
import { useText } from '@/hooks/use-text'
import { useWindowTitle } from '@/hooks/use-window-title'
import { UserPlus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function EmployeesPage() {
  const { text } = useText()
  const { setHeader } = usePageHeader()
  const { data: employees } = useProfiles({ role: 'employee' })
  const [open, setOpen] = useState(false)

  useWindowTitle(text.page.employees.title)

  useEffect(() => {
    setHeader({
      title: text.page.employees.title,
      actionGroup: (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <UserPlus className="size-4" />
          {text.page.employees.newEmployee}
        </Button>
      ),
    })
    return () => setHeader(null)
  }, [setHeader, text])

  const list = employees ?? []

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {list.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>{text.page.employees.empty}</EmptyTitle>
            <EmptyDescription>{text.page.employees.emptyDesc}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-border divide-y rounded-lg border">
          {list.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.full_name || p.email}</p>
                {p.full_name && (
                  <p className="text-muted-foreground truncate text-xs">{p.email}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <CreateEmployeeDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
