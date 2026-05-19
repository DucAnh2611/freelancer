-- A user related to a transfer needs to know *something* about the other
-- side's job (title, status, who's on it), but not the full record — rates,
-- description, taxes, and so on stay private. RLS on `jobs` blocks direct
-- SELECT for non-assignees, so we expose a narrow preview through a
-- SECURITY DEFINER function that enforces the relatedness check inline.

CREATE OR REPLACE FUNCTION get_job_preview_for_transfer(
  job_uuid UUID,
  uid UUID
)
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
    AND EXISTS (
      SELECT 1 FROM job_transfer t
      WHERE (t.job_id = job_uuid OR t.new_job_id = job_uuid)
        AND uid IN (t.from_user_id, t.to_user_id, j.hirer_id)
    );
$fn$;

GRANT EXECUTE ON FUNCTION get_job_preview_for_transfer(UUID, UUID) TO authenticated;
