import { texts, type TextPath } from '@/constants/text'

export type TextOptions = {
  bind?: Record<string, unknown>
}

function resolve(path: string): string {
  const parts = path.split('.')
  let current: unknown = texts
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return path
    }
  }
  return typeof current === 'string' ? current : path
}

function resolveBindPath(root: unknown, expr: string): unknown {
  const parts = expr.split(/[.[\]]+/).filter(Boolean)
  let current: unknown = root
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

export function textBind(path: TextPath, options?: TextOptions): string {
  const template = resolve(path)
  const bind = options?.bind
  if (!bind) return template
  return template.replace(/\{\{([^}]+)\}\}/g, (_, expr: string) => {
    const key = expr.trim()
    const value = resolveBindPath(bind, key)
    return value === undefined ? `{{${key}}}` : String(value)
  })
}
