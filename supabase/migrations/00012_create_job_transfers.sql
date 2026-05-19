CREATE TABLE job_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  from_employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transferred_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE job_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hirers can manage transfers for own jobs"
  ON job_transfers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = job_transfers.job_id AND jobs.hirer_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view own transfers"
  ON job_transfers FOR SELECT
  USING (auth.uid() = from_employee_id OR auth.uid() = to_employee_id);
