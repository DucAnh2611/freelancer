-- Create salary snapshots table
CREATE TABLE salary_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hirer_rate NUMERIC(12, 2) NOT NULL,
  employee_rate NUMERIC(12, 2) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  tax_rate NUMERIC(5, 2) NOT NULL,
  pay_date INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL,
  off_days_sal INTEGER NOT NULL DEFAULT 0,
  off_days_not_sal INTEGER NOT NULL DEFAULT 0,
  final_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, period_month, period_year)
);

-- RLS
ALTER TABLE salary_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hirers can view snapshots for own jobs"
  ON salary_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = salary_snapshots.job_id AND jobs.hirer_id = auth.uid()
    )
  );

CREATE POLICY "Hirers can create snapshots for own jobs"
  ON salary_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = salary_snapshots.job_id AND jobs.hirer_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view own snapshots"
  ON salary_snapshots FOR SELECT
  USING (auth.uid() = employee_id);
