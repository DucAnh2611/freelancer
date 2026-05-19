-- Job working hours + schedule
--   work_start / work_end define the calendar work window
--   lunch_start / lunch_end carve an unpaid break out of it
--   working_hours is the resulting paid hours per day (default 8 = 9.5 - 1.5)
-- Off-days gain partial_off_hours so an employee can mark "left X hours
-- early" instead of a full day — less than the job's working_hours.

ALTER TABLE jobs
  ADD COLUMN work_start TIME NOT NULL DEFAULT '08:00',
  ADD COLUMN work_end TIME NOT NULL DEFAULT '17:30',
  ADD COLUMN lunch_start TIME DEFAULT '12:00',
  ADD COLUMN lunch_end TIME DEFAULT '13:30',
  ADD COLUMN working_hours NUMERIC(5, 2) NOT NULL DEFAULT 8;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_working_hours_range CHECK (working_hours > 0 AND working_hours <= 24);

ALTER TABLE off_dates
  ADD COLUMN partial_off_hours NUMERIC(5, 2)
  CHECK (partial_off_hours IS NULL OR partial_off_hours > 0);
