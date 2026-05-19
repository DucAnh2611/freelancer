-- Simplify profile visibility: any authenticated user can view any profile.
-- The previous "Hirers can view employee profiles" policy relied on a
-- SECURITY DEFINER helper and didn't surface rows to the client even when
-- rows existed. Broad-read is acceptable here — employees already see hirer
-- profiles on job cards and vice versa. Updates/deletes remain restricted.

DROP POLICY IF EXISTS "Hirers can view employee profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Authenticated can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);
