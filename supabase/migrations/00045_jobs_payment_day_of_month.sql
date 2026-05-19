-- Replace the nullable DATE payment_date with a day-of-month (1..31) INT.
-- Semantics changed: the column represents the day each month payment is
-- due, not a specific calendar date. Keep it nullable so existing jobs stay
-- valid until filled in.

ALTER TABLE jobs DROP COLUMN IF EXISTS payment_date;

ALTER TABLE jobs
  ADD COLUMN payment_day SMALLINT
  CHECK (payment_day IS NULL OR (payment_day BETWEEN 1 AND 31));
