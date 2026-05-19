-- Widen transfer chat visibility to "any user related to the job chain":
--   - the hirer of the source job (or the clone)
--   - the current employee of the source job (or the clone)
--   - the transfer's from_user / to_user
-- This covers downstream reassignments (e.g. an employee assigned to the clone
-- still needs context from the handover thread). Writes stay scoped the same
-- way so only involved users can post.

DROP POLICY IF EXISTS "Transfer participants can view messages" ON transfer_message;
DROP POLICY IF EXISTS "Transfer participants can post messages" ON transfer_message;
DROP POLICY IF EXISTS "Participants can record read receipts for visible messages" ON transfer_message_read;
DROP POLICY IF EXISTS "Participants can view read receipts for visible messages" ON transfer_message_read;

CREATE OR REPLACE FUNCTION is_transfer_related(transfer_row_id UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM job_transfer t
    LEFT JOIN jobs j ON j.id = t.job_id
    LEFT JOIN jobs nj ON nj.id = t.new_job_id
    WHERE t.id = transfer_row_id
      AND uid IN (
        t.from_user_id,
        t.to_user_id,
        j.hirer_id,
        j.employee_id,
        nj.hirer_id,
        nj.employee_id
      )
  );
$fn$;

GRANT EXECUTE ON FUNCTION is_transfer_related(UUID, UUID) TO authenticated;

CREATE POLICY "Related users can view transfer messages"
  ON transfer_message FOR SELECT
  USING (is_transfer_related(transfer_id, auth.uid()));

CREATE POLICY "Related users can post transfer messages"
  ON transfer_message FOR INSERT
  WITH CHECK (author_id = auth.uid() AND is_transfer_related(transfer_id, auth.uid()));

CREATE POLICY "Related users can record read receipts"
  ON transfer_message_read FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM transfer_message m
      WHERE m.id = transfer_message_read.message_id
        AND is_transfer_related(m.transfer_id, auth.uid())
    )
  );

CREATE POLICY "Related users can view read receipts"
  ON transfer_message_read FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transfer_message m
      WHERE m.id = transfer_message_read.message_id
        AND is_transfer_related(m.transfer_id, auth.uid())
    )
  );

-- Broaden transfer-row visibility the same way so anyone in the chain sees the
-- transfer record itself (needed for the "Transfer from" banner and finish UI).
DROP POLICY IF EXISTS "Parties can view own transfers" ON job_transfer;

CREATE POLICY "Related users can view transfers"
  ON job_transfer FOR SELECT
  USING (is_transfer_related(id, auth.uid()));
