-- Fix exec_sql: stop double-executing queries
-- Old version ran DDL twice (once as EXECUTE, once wrapped in SELECT), causing silent failures
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  result json;
  trimmed text;
BEGIN
  trimmed := LOWER(LTRIM(query));

  IF trimmed LIKE 'select%' OR trimmed LIKE 'with%' THEN
    EXECUTE 'SELECT COALESCE(json_agg(t), ''[]''::json) FROM (' || query || ') t' INTO result;
    RETURN result;
  END IF;

  EXECUTE query;
  RETURN '[]'::json;
END;
$fn$;

-- Re-apply trigger fix with SET search_path = public
-- Required for triggers on auth.users in Supabase (both Cloud and self-hosted)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, settings)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'employee'),
    '{}'::jsonb
  );
  RETURN NEW;
END;
$fn$;

-- Backfill profiles for any users created while trigger was broken
INSERT INTO profiles (id, email, full_name, role, settings)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE((u.raw_user_meta_data->>'role')::user_role, 'employee'),
  '{}'::jsonb
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
