-- Bootstrap: creates exec_sql function used by migration scripts
-- This function allows running arbitrary SQL via supabase.rpc('exec_sql', { query: '...' })
-- Only accessible with service_role key (not exposed to anon/authenticated users)

CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  trimmed text;
BEGIN
  trimmed := LOWER(LTRIM(query));

  -- SELECT/WITH queries: return results as JSON
  IF trimmed LIKE 'select%' OR trimmed LIKE 'with%' THEN
    EXECUTE 'SELECT COALESCE(json_agg(t), ''[]''::json) FROM (' || query || ') t' INTO result;
    RETURN result;
  END IF;

  -- DDL/DML: just execute, return empty array
  EXECUTE query;
  RETURN '[]'::json;
END;
$$;

-- Restrict to service_role only
REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM public;
REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM anon;
REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM authenticated;

-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
