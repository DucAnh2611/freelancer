-- Tighten the preview RPC: drop the client-supplied uid and read it from
-- auth.uid() directly. SECURITY DEFINER still bypasses RLS, but the viewer
-- identity now comes from the session JWT — no way for a caller to spoof
-- someone else. Also nudges PostgREST to reload its schema cache so the new
-- signature is picked up immediately.

DROP FUNCTION IF EXISTS get_job_preview_for_transfer(UUID, UUID);

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
  employee_email TEXT
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
    ep.email
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
