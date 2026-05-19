-- Let users who are part of any transfer touching a job (source OR clone) see
-- that job in their list. Previously only hirer + assigned employee could SELECT,
-- which hid the source job from the transferee until the transfer finished and a
-- clone job was created.

CREATE POLICY "Transfer parties can view involved jobs"
  ON jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_transfer t
      WHERE (t.job_id = jobs.id OR t.new_job_id = jobs.id)
        AND auth.uid() IN (t.from_user_id, t.to_user_id)
    )
  );
