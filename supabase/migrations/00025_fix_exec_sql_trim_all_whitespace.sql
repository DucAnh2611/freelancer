-- LTRIM(text) with one arg only strips spaces, not newlines/tabs.
-- Multi-line queries (starting with \n) failed the LIKE 'select%' check
-- and fell through to the DDL path, silently returning [] with no results.
-- Fix: strip all leading whitespace chars explicitly.

CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  result json;
  normalized text;
BEGIN
  normalized := LTRIM(query, E' \t\n\r');

  IF LOWER(normalized) LIKE 'select%' OR LOWER(normalized) LIKE 'with%' THEN
    EXECUTE 'SELECT COALESCE(json_agg(t), ''[]''::json) FROM (' || normalized || ') t' INTO result;
    RETURN result;
  END IF;

  EXECUTE query;
  RETURN '[]'::json;
END;
$fn$;
