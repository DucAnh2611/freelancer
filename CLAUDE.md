# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Freelancer Manager — a mobile-first web app for managing jobs between hirers and employees. Built with React + Vite + TypeScript + Supabase + TailwindCSS v4 + shadcn/ui.

## Commands

```bash
# Dev server (uses --mode to load .env.dev / .env.test / .env.prod)
npm run dev              # local
npm run dev:test         # test
npm run dev:prod         # prod

# Build
npm run build            # local
npm run build:prod       # prod

# Lint
npm run lint

# Add shadcn component
npm run comp:add <name>

# Supabase migrations (append :test or :prod for other envs)
npm run sp:push          # apply pending migrations
npm run sp:status        # show applied vs pending
npm run sp:test          # test DB connection
npm run sp:schema        # print table schemas
npm run sp:gen-types     # regenerate src/types/database.ts from DB
npm run sp:migrate -- <name>  # create new migration file
```

## Architecture

### Routing & Auth

`App.tsx` wraps everything in `QueryClientProvider > BrowserRouter > AuthProvider`. Routes are guarded by:

- `PrivateRoute` — redirects to `/login` if no session
- `RoleRoute` — restricts by `profile.role` ('hirer' | 'employee')
- `/` redirects to `/hirer` or `/employee` based on role

Auth state lives in `src/contexts/auth-context.tsx` (provider + context). The `useAuth()` hook is in `src/hooks/use-auth.ts` — separated to avoid react-refresh warnings.

### Type Generation

`src/types/database.ts` is **auto-generated** — never edit manually. After schema changes:
```bash
npm run sp:push && npm run sp:gen-types
```
This queries `information_schema` and `pg_enum` to produce typed `Database`, `Tables<T>`, `InsertTables<T>`, `UpdateTables<T>`.

### Migration System

SQL files in `supabase/migrations/` named sequentially (`00001_`, `00002_`, ...). Custom runner in `scripts/` connects via:
1. **pg-meta** (`/pg/query`) for self-hosted Supabase — auto-bootstraps
2. **RPC** (`exec_sql` function) for Supabase Cloud — requires one-time bootstrap via SQL Editor using `00000_bootstrap.sql`

Applied migrations tracked in `_migrations` table.

### Constants & Deferred Resolution

Project convention: **declare constants anywhere (module or component scope), resolve inside components.**

Constants that depend on hook-derived values (text, theme, etc.) are declared with `createConstant(factory)` so they can live at module scope (colocated with their domain, reusable). Components resolve them via `useConstants(defs, ...deps)`, which supplies the deps and returns `consts` + typed accessors.

- `src/lib/constants.ts` — `createConstant(factory | value)`, `Constant<TDeps, TValue>` type
- `src/hooks/use-constants.ts` — `useConstants(defs, ...deps)` → `{ consts, getConst, record }`
- `src/constants/` — domain-grouped constant modules (e.g. `text.ts`, `nav.tsx`)

Example:
```ts
// src/constants/nav.tsx — declared outside any component
export const leftTabs = createConstant((text: Texts): Tab[] => [
  { to: '/jobs', label: text.nav.jobs, icon: Briefcase },
])

export const fabLabelByPath = createConstant(
  (text: Texts): Record<string, string> => ({ '/jobs': text.fab.newJob }),
)

// inside a component — resolved with deps from hooks
const { text } = useText()
const { consts, getConst, record } = useConstants({ leftTabs, fabLabelByPath }, text)

consts.leftTabs                                 // pre-resolved value
getConst('leftTabs')                            // typed key lookup (same result)
getConst('leftTabs', altText)                   // re-resolve with override deps

// record — for constants whose resolved value is a lookup map
record('fabLabelByPath').get(pathname, text.fab.new)          // with fallback
record('fabLabelByPath', { '/extra': '...' }).get(pathname)    // with defaults merged
```

Plain values (not wrapped in `createConstant`) pass through `useConstants` untouched, so you can mix factory-based and static entries in one definitions object.

### Page Header

Pages register their top-bar content at runtime via a context rather than rendering their own `<header>`. The layout (`src/pages/layout.tsx`) reads the config from context and renders a single unified header.

- `src/contexts/page-header-context.tsx` — `PageHeaderConfig = { leading?, title?, sticky?, actionGroup? }`, `PageHeaderProvider`
- `src/hooks/use-page-header.ts` — `usePageHeader()` → `{ header, setHeader }`
- `sticky: true` (default) — renders above the ScrollArea, pinned. `sticky: false` — renders inside the ScrollArea so it scrolls with content.
- `leading` is typically a back button; `actionGroup` is the primary action (Save / Edit / etc.)

Pages set the header in a `useEffect` and clear on unmount:

```tsx
const { setHeader } = usePageHeader()

useEffect(() => {
  setHeader({
    title: text.page.jobs.title,
    leading: (
      <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
        <ChevronLeft className="size-4" />
      </Button>
    ),
    actionGroup: (
      <Button type="submit" form={JOB_FORM_ID} disabled={isPending}>
        {isPending ? text.page.jobs.form.saving : text.page.jobs.form.save}
      </Button>
    ),
  })
  return () => setHeader(null)
}, [setHeader, navigate, isPending, text])
```

**Forms + external Save button:** form components export a stable id constant (e.g. `JOB_FORM_ID = 'job-form'`) and render `<form id={JOB_FORM_ID}>`. The page's Save button in `actionGroup` uses `<Button type="submit" form={JOB_FORM_ID}>` so it can submit the form from outside the form's DOM subtree. Form components own no header — just fields.

### Forms

Forms use **react-hook-form + zod + shadcn Field**. Schemas live in `src/schema/<domain>.ts` and are wrapped with `createConstant` so validation messages pull from the text dictionary.

- `src/schema/<domain>.ts` — schema as `createConstant((text) => z.object({...}))`, plus `type XFormData = z.infer<ReturnType<typeof xSchema.resolve>>`
- `src/components/<x>-form.tsx` — uses `useForm` + `Controller`
- Field primitives: `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup` from `@/components/ui/field`
- Use `SelectCombobox` from `@/components/select-combobox` for any select dropdown — no native `<select>`. It wraps `Combobox` and maps between a primitive `value` (id or enum literal) and `{ value, label }` item objects, so the input displays the label while form state stays as the id.
- Select item lists also go through `createConstant` (see `src/constants/jobs.ts`)

Example:
```ts
// src/schema/jobs.ts
export const jobFormSchema = createConstant((text: Texts) =>
  z.object({
    title: z.string().min(1, text.page.jobs.form.titleRequired),
    // ...
  }),
)
export type JobFormData = z.infer<ReturnType<typeof jobFormSchema.resolve>>
```

```tsx
// src/components/job-form.tsx
const { text } = useText()
const { consts: schemaConsts } = useConstants({ jobFormSchema }, text)
const { consts: rateConsts } = useConstants({ rateTypeItems }, text)

const form = useForm<JobFormData>({
  resolver: zodResolver(schemaConsts.jobFormSchema),
  defaultValues: { /* ... */ },
})

<form onSubmit={form.handleSubmit(onSubmit)}>
  <FieldGroup>
    <Controller
      control={form.control}
      name="title"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="title">{text.page.jobs.form.fieldTitle}</FieldLabel>
          <Input id="title" aria-invalid={fieldState.invalid} {...field} />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />

    <Controller
      control={form.control}
      name="rate_type"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{text.page.jobs.form.fieldRateType}</FieldLabel>
          <SelectCombobox
            items={rateConsts.rateTypeItems}
            value={field.value}
            onChange={(v) => field.onChange(v ?? 'hourly')}
            placeholder={text.page.jobs.form.fieldRateTypePlaceholder}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  </FieldGroup>
</form>
```

### Data Fetching

All service functions in `src/services/` **must declare an explicit `Promise<T>` return type**. Supabase-js infers result types from the Database generic + select string, but non-literal select strings (e.g. `const JOB_SELECT = '...'`) or queries with embedded joins (`hirer:profiles!jobs_hirer_id_fkey(...)`) often resolve to `never` downstream, which then propagates to hooks, mutations, and pages (`Property 'id' does not exist on type 'never'`).

Rules:

1. Declare a top-level relation type (e.g. `JobWithRelations = Tables<'jobs'> & { hirer: ProfileRef | null, employee: ProfileRef | null }`) that models the joined shape of `JOB_SELECT`.
2. Annotate every async service function with `Promise<T>` — `Promise<T[]>` for list, `Promise<T>` for single, `Promise<T | null>` only when you truly allow null.
3. When supabase's own narrowing fights the explicit type (common with joined selects), cast at the `return` with `as unknown as T`. Keep the cast co-located with the select — do not push it into callers.
4. Derive UI types (`JobListItem`, `JobDetail`) from the service return type — do not let TanStack Query infer upward.

Example:
```ts
// src/services/jobs.ts
export type JobWithRelations = Tables<'jobs'> & {
  hirer: ProfileRef | null
  employee: ProfileRef | null
}

export async function getJob(id: string): Promise<JobWithRelations> {
  const { data, error } = await supabase.from('jobs').select(JOB_SELECT).eq('id', id).single()
  if (error) throw error
  return data as unknown as JobWithRelations
}
```

The gen-types script emits `__InternalSupabase: { PostgrestVersion: '12' }` and `Relationships: []` on each table so that `supabase.from(...).insert(...)` resolves to a real shape instead of `never`. If you hand-edit `src/types/database.ts` (don't) or the script changes, make sure those markers survive.

### Environment Files

Three environments: `.env.dev`, `.env.test`, `.env.prod`. Required vars:
- `VITE_SUPABASE_URL` — project URL
- `VITE_SUPABASE_ANON_KEY` — anon key (used by frontend)
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (used by migration scripts)

Vite loads env via `--mode` flag. Scripts use `cross-env ENV_FILE=` for Windows compat.

## Conventions

- Path alias: `@/` maps to `./src/`
- shadcn components in `src/components/ui/`, app components in `src/components/`
- Pages organized by role: `src/pages/{auth,hirer,employee,shared}/`
- Prettier: single quotes, no semicolons, 100 char width, tailwind class sorting
- ESLint: unused vars prefixed with `_`, consistent type imports, no bare `console.log`
- Design docs in `docs/base.md` (requirements + audit log) and `docs/design.md` (ASCII wireframes)
- Audit entries in `docs/base.md` use `> DD/MM/YYYY` format below changed lines — these are documentation only, not implementation requests
