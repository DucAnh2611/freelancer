-- Per-job one-shot integration record. Stores the result of a bulk import
-- of historical reports + off_dates performed by the hirer when migrating a
-- pre-existing job into the app. UNIQUE(job_id) enforces the "one time only"
-- rule at the DB level.

CREATE TABLE job_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reports_imported INT NOT NULL DEFAULT 0,
  reports_failed INT NOT NULL DEFAULT 0,
  off_dates_imported INT NOT NULL DEFAULT 0,
  off_dates_failed INT NOT NULL DEFAULT 0,
  -- { reports: [{date, ok, error?}], offDates: [{date, ok, error?}] }
  summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE job_integrations ENABLE ROW LEVEL SECURITY;

-- Hirer of the job can see and create the integration row. Employees don't
-- interact with this table directly.
CREATE POLICY job_integrations_hirer_select ON job_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_integrations.job_id
        AND jobs.hirer_id = auth.uid()
    )
  );

CREATE POLICY job_integrations_hirer_insert ON job_integrations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_integrations.job_id
        AND jobs.hirer_id = auth.uid()
    )
  );
