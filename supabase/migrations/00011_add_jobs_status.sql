CREATE TYPE job_status AS ENUM ('active', 'cancelled');

ALTER TABLE jobs ADD COLUMN status job_status NOT NULL DEFAULT 'active';
ALTER TABLE jobs ADD COLUMN cancel_reason TEXT;
