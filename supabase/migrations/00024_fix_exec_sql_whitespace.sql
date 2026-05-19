CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  result json;
  normalized text;
BEGIN
  normalized := LTRIM(query);

  IF LOWER(normalized) LIKE 'select%' OR LOWER(normalized) LIKE 'with%' THEN
    EXECUTE 'SELECT COALESCE(json_agg(t), ''[]''::json) FROM (' || normalized || ') t' INTO result;
    RETURN result;
  END IF;

  EXECUTE query;
  RETURN '[]'::json;
END;
$fn$;
