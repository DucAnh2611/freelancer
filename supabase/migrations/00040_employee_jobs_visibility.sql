-- Employees should only see jobs they are currently assigned to. Remove the
-- broad "transfer parties can view involved jobs" policy added in 00036/00037,
-- which was designed for the old pending-transfer flow and let any past
-- transfer party see the source job in their list.
--
-- Keep a narrow escape hatch so the "Transferred from" hover card on the
-- clone's detail page still works: if the viewer is the current employee on
-- a clone, they can read the one source job that clone came from.

DROP POLICY IF EXISTS "Transfer parties can view involved jobs" ON jobs;

CREATE OR REPLACE FUNCTION is_viewer_clone_employee_of(source_job_id UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM jobs clone
    WHERE clone.transferred_from_job_id = source_job_id
      AND clone.employee_id = uid
  );
$fn$;

GRANT EXECUTE ON FUNCTION is_viewer_clone_employee_of(UUID, UUID) TO authenticated;

CREATE POLICY "Clone employees can view source job"
  ON jobs FOR SELECT
  USING (is_viewer_clone_employee_of(id, auth.uid()));
