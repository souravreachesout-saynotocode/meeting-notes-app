-- Feedback widget + Usage tracking
-- Run this in your Supabase SQL Editor

-- 1. Feedback table
CREATE TABLE feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email       TEXT,
  message     TEXT,
  rating      TEXT CHECK (rating IN ('positive', 'neutral', 'negative')),
  page        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert feedback" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access on feedback" ON feedback FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON feedback TO anon, authenticated;

-- 2. Usage tracking table
CREATE TABLE usage_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost_cents  NUMERIC(10,4) DEFAULT 0,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_logs_user ON usage_logs (user_id, created_at DESC);
CREATE INDEX idx_usage_logs_action ON usage_logs (action);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" ON usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on usage_logs" ON usage_logs FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON usage_logs TO anon, authenticated;
