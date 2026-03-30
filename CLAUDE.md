@AGENTS.md

# Meeting Notes App

Personal meeting notes web app with AI transcription and summarization.

## Tech Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui (manual setup)
- Supabase (Postgres + Storage)
- OpenAI Whisper API (transcription, Hindi+English auto-detect)
- Claude Sonnet (claude-sonnet-4-20250514) for summary + chat
- Export as .txt (Granola-style)

## Project Structure
- `src/app/` — Pages and API routes (App Router)
- `src/components/ui/` — shadcn/ui components (manually created, no registry)
- `src/components/` — App-specific components
- `src/lib/supabase/` — Supabase clients (client.ts for browser, server.ts for API routes)
- `src/lib/` — AI clients (openai.ts, claude.ts), utilities
- `src/hooks/` — React hooks (audio recording, chat)
- `src/types/` — TypeScript types
- `supabase/migrations/` — SQL migrations

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Build for production
- `npm run lint` — Run ESLint

## Key Decisions
- Single-user app — no auth, RLS disabled
- API keys in .env.local (server-side only, except NEXT_PUBLIC_SUPABASE_*)
- shadcn/ui components created manually (registry unavailable in this env)
- System fonts instead of Google Fonts
- System audio recording only on desktop Chrome/Edge (hidden on mobile)
