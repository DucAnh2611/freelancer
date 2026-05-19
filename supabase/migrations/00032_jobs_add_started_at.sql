-- Track when a job transitions from idle → started, so the detail page can
-- show "started from <date>". Backfills existing `started` rows with their
-- last-update time so we have a meaningful value for pre-existing data.

ALTER TABLE jobs ADD COLUMN started_at TIMESTAMPTZ;

UPDATE jobs SET started_at = updated_at WHERE status = 'started' AND started_at IS NULL;
