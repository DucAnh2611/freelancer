DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_reports' AND column_name = 'title'
  ) THEN
    ALTER TABLE daily_reports DROP COLUMN title;
  END IF;
END $$;
