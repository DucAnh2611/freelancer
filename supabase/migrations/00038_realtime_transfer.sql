-- Broadcast chat changes to connected clients via Supabase realtime.
-- Publishes transfer_message (new messages, pin toggles) and
-- transfer_message_read (seen receipts) on the default supabase_realtime
-- publication.

ALTER PUBLICATION supabase_realtime ADD TABLE transfer_message;
ALTER PUBLICATION supabase_realtime ADD TABLE transfer_message_read;
