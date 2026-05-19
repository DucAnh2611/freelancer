-- Transfer lifecycle + chat. Build on the job_transfer table created in 00031.
--   job_transfer gains: status (pending/finished), new_job_id (cloned job),
--   finished_at timestamp.
--   jobs gains: transferred_from_job_id (lineage pointer).
--   transfer_message: multi-party chat scoped to a transfer, markdown content,
--   pinnable.
--   transfer_message_read: per-user read receipts (drives seen + unread count).

CREATE TYPE transfer_status AS ENUM ('pending', 'finished');

ALTER TABLE job_transfer
  ADD COLUMN status transfer_status NOT NULL DEFAULT 'pending',
  ADD COLUMN new_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  ADD COLUMN finished_at TIMESTAMPTZ;

CREATE INDEX job_transfer_status_idx ON job_transfer(status);

ALTER TABLE jobs
  ADD COLUMN transferred_from_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

CREATE INDEX jobs_transferred_from_job_id_idx ON jobs(transferred_from_job_id);

CREATE TABLE transfer_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES job_transfer(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX transfer_message_transfer_id_idx ON transfer_message(transfer_id);
CREATE INDEX transfer_message_author_id_idx ON transfer_message(author_id);
CREATE INDEX transfer_message_pinned_idx ON transfer_message(transfer_id, pinned) WHERE pinned;

CREATE TRIGGER transfer_message_updated_at
  BEFORE UPDATE ON transfer_message
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE transfer_message_read (
  message_id UUID NOT NULL REFERENCES transfer_message(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX transfer_message_read_user_id_idx ON transfer_message_read(user_id);

-- RLS: participants (hirer + from_user + to_user of the transfer) can read and
-- write messages. Anyone can record their own read receipt for messages they
-- can see.

ALTER TABLE transfer_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_message_read ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transfer participants can view messages"
  ON transfer_message FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM job_transfer t
      JOIN jobs j ON j.id = t.job_id
      WHERE t.id = transfer_message.transfer_id
        AND (
          auth.uid() = j.hirer_id
          OR auth.uid() = t.from_user_id
          OR auth.uid() = t.to_user_id
        )
    )
  );

CREATE POLICY "Transfer participants can post messages"
  ON transfer_message FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM job_transfer t
      JOIN jobs j ON j.id = t.job_id
      WHERE t.id = transfer_message.transfer_id
        AND (
          auth.uid() = j.hirer_id
          OR auth.uid() = t.from_user_id
          OR auth.uid() = t.to_user_id
        )
    )
  );

CREATE POLICY "Authors can update own messages"
  ON transfer_message FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Hirer can pin any message in the thread"
  ON transfer_message FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM job_transfer t
      JOIN jobs j ON j.id = t.job_id
      WHERE t.id = transfer_message.transfer_id AND j.hirer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM job_transfer t
      JOIN jobs j ON j.id = t.job_id
      WHERE t.id = transfer_message.transfer_id AND j.hirer_id = auth.uid()
    )
  );

CREATE POLICY "Participants can record read receipts for visible messages"
  ON transfer_message_read FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM transfer_message m
      JOIN job_transfer t ON t.id = m.transfer_id
      JOIN jobs j ON j.id = t.job_id
      WHERE m.id = transfer_message_read.message_id
        AND (
          auth.uid() = j.hirer_id
          OR auth.uid() = t.from_user_id
          OR auth.uid() = t.to_user_id
        )
    )
  );

CREATE POLICY "Participants can view read receipts for visible messages"
  ON transfer_message_read FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM transfer_message m
      JOIN job_transfer t ON t.id = m.transfer_id
      JOIN jobs j ON j.id = t.job_id
      WHERE m.id = transfer_message_read.message_id
        AND (
          auth.uid() = j.hirer_id
          OR auth.uid() = t.from_user_id
          OR auth.uid() = t.to_user_id
        )
    )
  );
