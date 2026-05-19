-- Expose working_hours + payment_day on the transfer-preview RPC so the
-- counterpart popup can show them alongside the rest of the base info.

DROP FUNCTION IF EXISTS get_job_preview_for_transfer(UUID);

CREATE OR REPLACE FUNCTION get_job_preview_for_transfer(job_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  status job_status,
  started_at TIMESTAMPTZ,
  transferred_from_job_id UUID,
  hirer_id UUID,
  hirer_name TEXT,
  hirer_email TEXT,
  employee_id UUID,
  employee_name TEXT,
  employee_email TEXT,
  working_hours NUMERIC,
  payment_day SMALLINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT
    j.id,
    j.title,
    j.status,
    j.started_at,
    j.transferred_from_job_id,
    j.hirer_id,
    hp.full_name,
    hp.email,
    j.employee_id,
    ep.full_name,
    ep.email,
    j.working_hours,
    j.payment_day
  FROM jobs j
  LEFT JOIN profiles hp ON hp.id = j.hirer_id
  LEFT JOIN profiles ep ON ep.id = j.employee_id
  WHERE j.id = job_uuid
    AND (
      auth.uid() = j.hirer_id
      OR auth.uid() = j.employee_id
      OR EXISTS (
        SELECT 1 FROM job_transfer t
        WHERE (t.job_id = job_uuid OR t.new_job_id = job_uuid)
          AND auth.uid() IN (t.from_user_id, t.to_user_id)
      )
    );
$fn$;

GRANT EXECUTE ON FUNCTION get_job_preview_for_transfer(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
