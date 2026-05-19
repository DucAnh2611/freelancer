-- Create off dates table
CREATE TABLE off_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type off_date_type NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, user_id, date)
);

-- RLS
ALTER TABLE off_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own off dates"
  ON off_dates FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Hirers can view off dates for own jobs"
  ON off_dates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = off_dates.job_id AND jobs.hirer_id = auth.uid()
    )
  );
