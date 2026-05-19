-- Flatten chat permissions so every transfer participant has the same rights:
-- any related user can pin/unpin any message (previously hirer-only). Drop the
-- "Authors can update own messages" and hirer-only pin policies; replace with
-- a single "Any related user can update messages" policy gated on the
-- is_transfer_related helper from 00035.

DROP POLICY IF EXISTS "Authors can update own messages" ON transfer_message;
DROP POLICY IF EXISTS "Hirer can pin any message in the thread" ON transfer_message;

CREATE POLICY "Related users can update messages"
  ON transfer_message FOR UPDATE
  USING (is_transfer_related(transfer_id, auth.uid()))
  WITH CHECK (is_transfer_related(transfer_id, auth.uid()));
