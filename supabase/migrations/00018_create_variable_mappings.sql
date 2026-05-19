-- App-level variable mapping definitions for {{binding}} resolution
-- Each mapping defines how to resolve a {{variableName}} in copy templates
--
-- Example row:
--   name: "id"
--   table_name: "daily_reports"
--   field: "id"
--   fallback: null
--   transformer: { "name": "substring", "start": 0, "length": 8 }
--
-- When resolving {{id}}, the system:
--   1. Looks up this mapping by name
--   2. Queries table_name.field for the current context
--   3. Applies transformer if present
--   4. Falls back to fallback value on error, or null if no fallback
CREATE TABLE variable_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  field TEXT NOT NULL,
  fallback JSONB,
  transformer JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TRIGGER variable_mappings_updated_at
  BEFORE UPDATE ON variable_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE variable_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own variable mappings"
  ON variable_mappings FOR ALL
  USING (auth.uid() = user_id);
