-- Split tax into two numeric rates: job-level withholding + personal income tax.
-- Both are percentages (0..100).

ALTER TABLE jobs RENAME COLUMN tax_rate TO job_tax_rate;
ALTER TABLE jobs
  ADD COLUMN personal_tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_job_tax_rate_range CHECK (job_tax_rate BETWEEN 0 AND 100),
  ADD CONSTRAINT jobs_personal_tax_rate_range CHECK (personal_tax_rate BETWEEN 0 AND 100);

ALTER TABLE salary_snapshots RENAME COLUMN tax_rate TO job_tax_rate;
ALTER TABLE salary_snapshots
  ADD COLUMN personal_tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE salary_snapshots
  ADD CONSTRAINT salary_snapshots_job_tax_rate_range CHECK (job_tax_rate BETWEEN 0 AND 100),
  ADD CONSTRAINT salary_snapshots_personal_tax_rate_range CHECK (personal_tax_rate BETWEEN 0 AND 100);
