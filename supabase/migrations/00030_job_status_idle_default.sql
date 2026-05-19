-- Backfill existing jobs: any without an assigned employee becomes idle.
-- New rows default to idle; starting a job requires an employee to be set.

UPDATE jobs SET status = 'idle' WHERE status = 'started' AND employee_id IS NULL;

ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'idle';
