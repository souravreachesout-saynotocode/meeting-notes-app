-- Growth Features: Shared meetings, Team workspaces, Public share links
-- Run this in your Supabase SQL Editor

-- 1. Team workspaces
CREATE TABLE workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT '🏢',
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Add workspace_id to meetings (optional — personal meetings have NULL)
ALTER TABLE meetings ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
CREATE INDEX idx_meetings_workspace ON meetings (workspace_id);

-- 2. Shared meetings (invite by email)
CREATE TABLE meeting_shares (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  shared_by    UUID NOT NULL REFERENCES auth.users(id),
  shared_with  UUID REFERENCES auth.users(id),
  email        TEXT NOT NULL,
  permission   TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  accepted     BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meeting_shares_meeting ON meeting_shares (meeting_id);
CREATE INDEX idx_meeting_shares_email ON meeting_shares (email);
CREATE INDEX idx_meeting_shares_user ON meeting_shares (shared_with);

-- 3. Public share links
CREATE TABLE public_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL UNIQUE,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  is_active   BOOLEAN DEFAULT true,
  expires_at  TIMESTAMPTZ,
  view_count  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_public_link_meeting UNIQUE (meeting_id)
);

CREATE INDEX idx_public_links_slug ON public_links (slug);

-- 4. RLS policies

-- Workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view workspaces they belong to" ON workspaces FOR SELECT
  USING (id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Owners can update workspaces" ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY "Users can create workspaces" ON workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can delete workspaces" ON workspaces FOR DELETE
  USING (owner_id = auth.uid());
CREATE POLICY "Service role full access on workspaces" ON workspaces FOR ALL
  USING (auth.role() = 'service_role');

-- Workspace members
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view workspace members" ON workspace_members FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));
CREATE POLICY "Service role full access on workspace_members" ON workspace_members FOR ALL
  USING (auth.role() = 'service_role');

-- Meeting shares
ALTER TABLE meeting_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view shares for their meetings" ON meeting_shares FOR SELECT
  USING (
    shared_by = auth.uid()
    OR shared_with = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
CREATE POLICY "Users can share their own meetings" ON meeting_shares FOR INSERT
  WITH CHECK (meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their own shares" ON meeting_shares FOR DELETE
  USING (shared_by = auth.uid());
CREATE POLICY "Service role full access on meeting_shares" ON meeting_shares FOR ALL
  USING (auth.role() = 'service_role');

-- Update meetings policy to include shared meetings
CREATE POLICY "Users can view shared meetings" ON meetings FOR SELECT
  USING (
    id IN (
      SELECT meeting_id FROM meeting_shares
      WHERE shared_with = auth.uid()
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Update meetings policy to include workspace meetings
CREATE POLICY "Users can view workspace meetings" ON meetings FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Public links
ALTER TABLE public_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own public links" ON public_links FOR ALL
  USING (created_by = auth.uid());
CREATE POLICY "Service role full access on public_links" ON public_links FOR ALL
  USING (auth.role() = 'service_role');

-- Grants
GRANT ALL ON workspaces TO anon, authenticated;
GRANT ALL ON workspace_members TO anon, authenticated;
GRANT ALL ON meeting_shares TO anon, authenticated;
GRANT ALL ON public_links TO anon, authenticated;

-- Updated_at trigger for workspaces
CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
