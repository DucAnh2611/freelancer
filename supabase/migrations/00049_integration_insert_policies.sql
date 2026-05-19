-- Allow a job's hirer to insert historical daily_reports / off_dates on
-- behalf of the job's employee — but only while the job hasn't been
-- integrated yet. Once a job_integrations row exists for the job, this
-- policy stops matching and the insert path is closed.
--
-- The existing "Users can manage own reports/off dates" policies are
-- unchanged; this adds a parallel INSERT-only policy for the integration
-- flow. The UNIQUE(job_id) on job_integrations is what makes the "one time
-- only" promise hold.

CREATE POLICY daily_reports_hirer_integration_insert
  ON daily_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = daily_reports.job_id
        AND jobs.hirer_id = auth.uid()
        AND jobs.employee_id = daily_reports.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM job_integrations
      WHERE job_integrations.job_id = daily_reports.job_id
    )
  );

CREATE POLICY off_dates_hirer_integration_insert
  ON off_dates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = off_dates.job_id
        AND jobs.hirer_id = auth.uid()
        AND jobs.employee_id = off_dates.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM job_integrations
      WHERE job_integrations.job_id = off_dates.job_id
    )
  );
