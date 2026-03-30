import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json([]);
  }

  const supabase = createServerClient();

  // Search transcripts using trigram matching (handles Hindi + English)
  const { data: transcriptResults } = await supabase
    .from("transcripts")
    .select("meeting_id, content")
    .ilike("content", `%${query}%`)
    .limit(20);

  // Search summaries
  const { data: summaryResults } = await supabase
    .from("summaries")
    .select("meeting_id, summary")
    .ilike("summary", `%${query}%`)
    .limit(20);

  // Get unique meeting IDs
  const meetingIds = [
    ...new Set([
      ...(transcriptResults || []).map((r) => r.meeting_id),
      ...(summaryResults || []).map((r) => r.meeting_id),
    ]),
  ];

  if (meetingIds.length === 0) {
    return NextResponse.json([]);
  }

  // Get meeting details
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, title, created_at")
    .in("id", meetingIds);

  const meetingMap = new Map(
    (meetings || []).map((m) => [m.id, m])
  );

  // Build results with snippets
  const results = [];

  for (const t of transcriptResults || []) {
    const meeting = meetingMap.get(t.meeting_id);
    if (!meeting) continue;

    const idx = t.content.toLowerCase().indexOf(query.toLowerCase());
    const start = Math.max(0, idx - 80);
    const end = Math.min(t.content.length, idx + query.length + 80);
    const snippet =
      (start > 0 ? "..." : "") +
      t.content.slice(start, end) +
      (end < t.content.length ? "..." : "");

    results.push({
      meeting_id: t.meeting_id,
      meeting_title: meeting.title,
      meeting_date: meeting.created_at,
      snippet,
      source: "transcript" as const,
    });
  }

  for (const s of summaryResults || []) {
    const meeting = meetingMap.get(s.meeting_id);
    if (!meeting) continue;
    if (results.some((r) => r.meeting_id === s.meeting_id)) continue;

    const idx = s.summary.toLowerCase().indexOf(query.toLowerCase());
    const start = Math.max(0, idx - 80);
    const end = Math.min(s.summary.length, idx + query.length + 80);
    const snippet =
      (start > 0 ? "..." : "") +
      s.summary.slice(start, end) +
      (end < s.summary.length ? "..." : "");

    results.push({
      meeting_id: s.meeting_id,
      meeting_title: meeting.title,
      meeting_date: meeting.created_at,
      snippet,
      source: "summary" as const,
    });
  }

  return NextResponse.json(results);
}
