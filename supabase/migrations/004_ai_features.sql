-- AI Features: Tags, Embeddings
-- Run this in your Supabase SQL Editor

-- 1. Tags table
CREATE TABLE tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  color       TEXT DEFAULT '#6b7280',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Meeting-tag junction table
CREATE TABLE meeting_tags (
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, tag_id)
);

CREATE INDEX idx_meeting_tags_meeting ON meeting_tags (meeting_id);
CREATE INDEX idx_meeting_tags_tag ON meeting_tags (tag_id);

-- 3. Embeddings table for semantic search
CREATE TABLE embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   vector(1536),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_embedding_meeting UNIQUE (meeting_id)
);

-- Enable pgvector extension (for semantic search)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create HNSW index for fast similarity search
CREATE INDEX idx_embeddings_vector ON embeddings
  USING hnsw (embedding vector_cosine_ops);

-- 4. Weekly digests table
CREATE TABLE weekly_digests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start  DATE NOT NULL,
  week_end    DATE NOT NULL,
  digest      TEXT NOT NULL,
  meeting_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_digest_user_week UNIQUE (user_id, week_start)
);

-- 5. RLS policies
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Service role full access on tags" ON tags FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE meeting_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own meeting tags" ON meeting_tags FOR SELECT
  USING (meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid()));
CREATE POLICY "Service role full access on meeting_tags" ON meeting_tags FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own embeddings" ON embeddings FOR SELECT
  USING (meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid()));
CREATE POLICY "Service role full access on embeddings" ON embeddings FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own digests" ON weekly_digests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on weekly_digests" ON weekly_digests FOR ALL USING (auth.role() = 'service_role');

-- Grants
GRANT ALL ON tags TO anon, authenticated;
GRANT ALL ON meeting_tags TO anon, authenticated;
GRANT ALL ON embeddings TO anon, authenticated;
GRANT ALL ON weekly_digests TO anon, authenticated;

-- Semantic search function
CREATE OR REPLACE FUNCTION match_meetings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  meeting_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.meeting_id,
    1 - (e.embedding <=> query_embedding) as similarity
  FROM embeddings e
  JOIN meetings m ON m.id = e.meeting_id
  WHERE
    (p_user_id IS NULL OR m.user_id = p_user_id)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
