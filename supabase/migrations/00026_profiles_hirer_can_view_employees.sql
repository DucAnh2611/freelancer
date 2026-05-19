-- Allow hirers to read employee profiles (for job assignment combobox).
-- The cross-row check uses a SECURITY DEFINER helper so the policy doesn't
-- recurse back into its own RLS when looking up the caller's role.

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT role FROM profiles WHERE id = auth.uid()
$fn$;

REVOKE EXECUTE ON FUNCTION current_user_role() FROM public;
GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;

CREATE POLICY "Hirers can view employee profiles"
  ON profiles FOR SELECT
  USING (
    role = 'employee' AND current_user_role() = 'hirer'
  );
