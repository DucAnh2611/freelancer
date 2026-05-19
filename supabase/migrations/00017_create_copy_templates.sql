-- Per-user copy format templates
-- format is an array of strings with {{variable}} bindings
-- e.g. ["{{id}} - {{description}}", "{{endline}}", "OT: {{ot_hours}}"]
-- joined by newline when copying
CREATE TABLE copy_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER copy_templates_updated_at
  BEFORE UPDATE ON copy_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE copy_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own copy templates"
  ON copy_templates FOR ALL
  USING (auth.uid() = user_id);
