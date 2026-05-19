CREATE TYPE rate_type AS ENUM ('hourly', 'daily', 'monthly');

ALTER TABLE jobs ADD COLUMN rate_type rate_type NOT NULL DEFAULT 'monthly';
