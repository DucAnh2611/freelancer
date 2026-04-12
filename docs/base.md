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

job have rate (hirerRate, employeeRate, amount, taxRate, payDate, description(markdown, optional))
employee can view job info
each month salary will be pay at paydate and should save snapshot incase future update of job data.

migration implement require for supabase
## feat
daily report:
- row: [ID] [title] [description(markdown, optional)] [estimate(optional)] [notes(optional)]

export excel to formal configurable
- provide columns def can drag and drop each in string: [ { col: string, data: "{{ID}} ... {{title}} ..." }, ... ]

off date: 
- declare a day is off day, that will affect income of job
- off days can have salary or not have salary
- each: [title] [description(markdown, optional)] [type(SAL, NOT_SAL)]

