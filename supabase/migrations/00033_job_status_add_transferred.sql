-- Add 'transferred' to the job_status enum. Must be separate from any query
-- that uses the new value in the same transaction (Postgres restriction).

ALTER TYPE job_status ADD VALUE 'transferred';
