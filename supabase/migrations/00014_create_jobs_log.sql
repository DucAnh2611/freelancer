CREATE TABLE jobs_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_log_job_id ON jobs_log(job_id);
CREATE INDEX idx_jobs_log_created_at ON jobs_log(created_at DESC);

ALTER TABLE jobs_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hirers can view logs for own jobs"
  ON jobs_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = jobs_log.job_id AND jobs.hirer_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view logs for assigned jobs"
  ON jobs_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = jobs_log.job_id AND jobs.employee_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert logs"
  ON jobs_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);
