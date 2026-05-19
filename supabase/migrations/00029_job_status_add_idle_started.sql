-- Transition job status from (active, cancelled) → (idle, started, cancelled).
-- Split into two migrations because ALTER TYPE ADD VALUE cannot be used in the
-- same transaction as subsequent reads/writes referencing the new value.

ALTER TYPE job_status RENAME VALUE 'active' TO 'started';
ALTER TYPE job_status ADD VALUE 'idle' BEFORE 'started';
