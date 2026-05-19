-- Replace the old `job_transfers` table (which assumed employee→employee) with
-- a neutral `job_transfer` table whose from/to can be either an employee or
-- the hirer. Transferring to the hirer means the hirer takes over the work.

DROP TABLE IF EXISTS job_transfers;

CREATE TABLE job_transfer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transferred_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_transfer_distinct_parties CHECK (from_user_id <> to_user_id)
);

CREATE INDEX job_transfer_job_id_idx ON job_transfer(job_id);
CREATE INDEX job_transfer_from_user_id_idx ON job_transfer(from_user_id);
CREATE INDEX job_transfer_to_user_id_idx ON job_transfer(to_user_id);

ALTER TABLE job_transfer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hirers can manage transfers for own jobs"
  ON job_transfer FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_transfer.job_id AND jobs.hirer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_transfer.job_id AND jobs.hirer_id = auth.uid()
    )
  );

CREATE POLICY "Parties can view own transfers"
  ON job_transfer FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
