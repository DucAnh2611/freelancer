-- Track when payment for the job is expected / due. Nullable so existing
-- jobs stay valid and new jobs opt in explicitly.

ALTER TABLE jobs ADD COLUMN payment_date DATE;
