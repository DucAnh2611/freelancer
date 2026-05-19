-- Fix "infinite recursion detected in policy for relation jobs".
--
-- The 00036 jobs SELECT policy queries job_transfer, and job_transfer's
-- "Hirers can manage..." policy queries jobs → the two policies call each
-- other during eval. A SECURITY DEFINER function bypasses RLS on both
-- tables, breaking the loop.

CREATE OR REPLACE FUNCTION is_job_transfer_party(check_job_id UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM job_transfer t
    WHERE (t.job_id = check_job_id OR t.new_job_id = check_job_id)
      AND uid IN (t.from_user_id, t.to_user_id)
  );
$fn$;

GRANT EXECUTE ON FUNCTION is_job_transfer_party(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Transfer parties can view involved jobs" ON jobs;

CREATE POLICY "Transfer parties can view involved jobs"
  ON jobs FOR SELECT
  USING (is_job_transfer_party(id, auth.uid()));
