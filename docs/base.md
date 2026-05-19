# Teach

Supabase
React + Vite
TailwindCSS
Typescript
Shadcn/ui

# Purpose

A freelancer manager.
2 role:

- hirer 1 -> M job
- job 1 -> employee

job have rate (hirerRate, employeeRate, amount, taxRate, description(markdown, optional), metadata)
employee can view job info
each month salary will be pay at paydate and should save snapshot incase future update of job data.

migration implement require for supabase

--- AUDIT FEAT --- 12/04/2026 15:07 ---
remove payDate in jobs table

## feat

daily report:

- row: [ID] [title] [description(markdown, optional)] [estimate(optional)] [notes(optional)]

export excel to formal configurable

- provide columns def can drag and drop each in string: [ { col: string, data: "{{ID}} ... {{title}} ..." }, ... ]

off date:

- declare a day is off day, that will affect income of job
- off days can have salary or not have salary
- each: [title] [description(markdown, optional)] [type(SAL, NOT_SAL)]

--- AUDIT FEAT --- 12/04/2026 15:07 ---
add: jobs transfer (transfer from employee to another employee)
add: jobs cancel (should save reason as string)
add: jobs schedule (schedule of jobs (like Friday alway have demo at 10:00 AM, payDate ...), each schedule will have title and description(markdown, optional))
add: jobs_log (log all activity of jobs (new daily at, new off date submit, transfer from, ...))

> 12/04/2026 15:23 --- START ---

1. update: each report do not need title, just need description
2. add: in list report/detail each row will have button copy to quick copy as format user configrable: ["{{...}}", "{{endline}}"].join("endline")
3. add: with "{{...}}" binding we can configure as app setting:

- we dynamically create mapping variable: [{ name: "id", mapping: "table_names", "field": string, falback?: any, transformer: { name, ...paramsOfTransformer } }, ...]
- when binding value using {{variableName}} -> passing those variable to api to get data then bind to string need, if error on any variable mapping, just need to use fallback, if no fallback, return null

4. With each report date add optional field: OT (unit: hour, optional)

> 12/04/2026 15:23 --- END ---
