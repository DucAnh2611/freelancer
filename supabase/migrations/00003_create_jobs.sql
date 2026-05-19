-- Create jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hirer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  hirer_rate NUMERIC(12, 2) NOT NULL,
  employee_rate NUMERIC(12, 2) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  pay_date INTEGER NOT NULL CHECK (pay_date BETWEEN 1 AND 31),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hirers can manage own jobs"
  ON jobs FOR ALL
  USING (auth.uid() = hirer_id);

CREATE POLICY "Employees can view assigned jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = employee_id);
