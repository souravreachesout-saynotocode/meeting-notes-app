-- Multi-user support: Add user_id to all tables + RLS policies
-- Run this in your Supabase SQL Editor

-- 1. Add user_id columns
ALTER TABLE meetings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE folders ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create indexes on user_id
CREATE INDEX idx_meetings_user ON meetings (user_id);
CREATE INDEX idx_folders_user ON folders (user_id);

-- 3. Drop old permissive policies
DROP POLICY IF EXISTS "Allow all on meetings" ON meetings;
DROP POLICY IF EXISTS "Allow all on transcripts" ON transcripts;
DROP POLICY IF EXISTS "Allow all on summaries" ON summaries;
DROP POLICY IF EXISTS "Allow all on chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all on folders" ON folders;

-- 4. Enable RLS on all tables
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- 5. Meetings: users can only see/edit their own
CREATE POLICY "Users can view own meetings"
  ON meetings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meetings"
  ON meetings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meetings"
  ON meetings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meetings"
  ON meetings FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypasses RLS for API routes
CREATE POLICY "Service role full access on meetings"
  ON meetings FOR ALL
  USING (auth.role() = 'service_role');

-- 6. Transcripts: access via meeting ownership
CREATE POLICY "Users can view own transcripts"
  ON transcripts FOR SELECT
  USING (meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own transcripts"
  ON transcripts FOR INSERT
  WITH CHECK (meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access on transcripts"
  ON transcripts FOR ALL
  USING (auth.role() = 'service_role');

-- 7. Summaries: access via meeting ownership
CREATE POLICY "Users can view own summaries"
  ON summaries FOR SELECT
  USING (meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own summaries"
  ON summaries FOR INSERT
  WITH CHECK (meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access on summaries"
  ON summaries FOR ALL
  USING (auth.role() = 'service_role');

-- 8. Chat messages: access via meeting ownership
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access on chat_messages"
  ON chat_messages FOR ALL
  USING (auth.role() = 'service_role');

-- 9. Folders: users can only see/edit their own
CREATE POLICY "Users can view own folders"
  ON folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON folders FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on folders"
  ON folders FOR ALL
  USING (auth.role() = 'service_role');

-- 10. Storage: users can only access their own audio
CREATE POLICY "Users can upload own audio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'meeting-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'meeting-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own audio"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'meeting-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Keep existing permissive storage policy for backward compat
-- (service role bypasses RLS anyway)
