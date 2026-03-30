-- Add folders support for organizing meetings
-- Run this in your Supabase SQL Editor

CREATE TABLE folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT '📁',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add folder_id to meetings
ALTER TABLE meetings ADD COLUMN folder_id UUID REFERENCES folders(id) ON SET NULL;
CREATE INDEX idx_meetings_folder ON meetings (folder_id);

-- Trigger for updated_at
CREATE TRIGGER folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Permissions
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on folders" ON folders FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON folders TO anon, authenticated;
