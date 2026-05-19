CREATE TABLE job_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  time_of_day TIME,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('weekly', 'monthly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER job_schedules_updated_at
  BEFORE UPDATE ON job_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE job_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hirers can manage schedules for own jobs"
  ON job_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = job_schedules.job_id AND jobs.hirer_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view schedules for assigned jobs"
  ON job_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = job_schedules.job_id AND jobs.employee_id = auth.uid()
    )
  );
