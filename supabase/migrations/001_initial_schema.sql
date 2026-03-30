-- Meeting Notes App - Initial Schema
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- MEETINGS table
-- ============================================
CREATE TABLE meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL DEFAULT 'Untitled Meeting',
  description     TEXT,
  recording_mode  TEXT NOT NULL CHECK (recording_mode IN ('microphone', 'screen')),
  status          TEXT NOT NULL DEFAULT 'recording'
                    CHECK (status IN ('recording', 'transcribing', 'summarizing', 'completed', 'error')),
  duration_seconds INTEGER,
  audio_path      TEXT,
  audio_size_bytes BIGINT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetings_created_at ON meetings (created_at DESC);

-- ============================================
-- TRANSCRIPTS table
-- ============================================
CREATE TABLE transcripts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  language        TEXT,
  word_count      INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_transcript_meeting UNIQUE (meeting_id)
);

CREATE INDEX idx_transcripts_fts ON transcripts
  USING GIN (to_tsvector('english', content));

CREATE INDEX idx_transcripts_trgm ON transcripts
  USING GIN (content gin_trgm_ops);

-- ============================================
-- SUMMARIES table
-- ============================================
CREATE TABLE summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  summary         TEXT NOT NULL,
  action_items    JSONB NOT NULL DEFAULT '[]',
  key_decisions   JSONB DEFAULT '[]',
  model_used      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_summary_meeting UNIQUE (meeting_id)
);

-- ============================================
-- CHAT_MESSAGES table
-- ============================================
CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_meeting ON chat_messages (meeting_id, created_at ASC);

-- ============================================
-- Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Disable RLS (single-user personal app)
-- ============================================
ALTER TABLE meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Storage: Create bucket for audio files
-- Run this separately in Supabase dashboard or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-audio', 'meeting-audio', false);
-- ============================================
