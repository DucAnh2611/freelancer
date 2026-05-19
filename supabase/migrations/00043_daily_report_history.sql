-- Enforce "one report per (user, job, day)" + audit every description change.
-- daily_report_edit captures the prior description each time a report is
-- updated, so the day dialog can show the evolution of the entry.

ALTER TABLE daily_reports
  ADD CONSTRAINT daily_reports_user_job_date_uniq
  UNIQUE (user_id, job_id, report_date);

CREATE TABLE daily_report_edit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  description_before TEXT,
  description_after TEXT,
  edited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX daily_report_edit_report_id_idx
  ON daily_report_edit(report_id);

ALTER TABLE daily_report_edit ENABLE ROW LEVEL SECURITY;

-- Author (owner of the report) + hirer on the parent job can read the trail.
CREATE POLICY "Author can view own report history"
  ON daily_report_edit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports r
      WHERE r.id = daily_report_edit.report_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Hirer can view report history on own jobs"
  ON daily_report_edit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports r
      JOIN jobs j ON j.id = r.job_id
      WHERE r.id = daily_report_edit.report_id
        AND j.hirer_id = auth.uid()
    )
  );

-- Trigger writes history only when the description actually changes.
CREATE OR REPLACE FUNCTION daily_report_log_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    INSERT INTO daily_report_edit (
      report_id, description_before, description_after, edited_by
    ) VALUES (
      NEW.id, OLD.description, NEW.description, COALESCE(auth.uid(), NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS daily_reports_log_edit ON daily_reports;
CREATE TRIGGER daily_reports_log_edit
  AFTER UPDATE ON daily_reports
  FOR EACH ROW EXECUTE FUNCTION daily_report_log_edit();
