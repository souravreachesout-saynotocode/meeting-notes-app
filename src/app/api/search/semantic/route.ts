import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAuthClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json([]);
  }

  // Get user for RLS
  const authSupabase = await createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  // Generate embedding for the search query
  const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: query,
    }),
  });

  if (!embeddingRes.ok) {
    return NextResponse.json(
      { error: "Failed to generate search embedding" },
      { status: 500 }
    );
  }

  const embData = await embeddingRes.json();
  const queryEmbedding = embData.data[0].embedding;

  // Use the match_meetings function for similarity search
  const supabase = createServerClient();
  const { data: matches, error } = await supabase.rpc("match_meetings", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: 0.5,
    match_count: 10,
    p_user_id: user?.id || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json([]);
  }

  // Get meeting details
  const meetingIds = matches.map((m: { meeting_id: string }) => m.meeting_id);
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, title, created_at")
    .in("id", meetingIds);

  const { data: summaries } = await supabase
    .from("summaries")
    .select("meeting_id, summary")
    .in("meeting_id", meetingIds);

  const meetingMap = new Map((meetings || []).map((m) => [m.id, m]));
  const summaryMap = new Map((summaries || []).map((s) => [s.meeting_id, s]));

  const results = matches.map((match: { meeting_id: string; similarity: number }) => {
    const meeting = meetingMap.get(match.meeting_id);
    const summary = summaryMap.get(match.meeting_id);
    return {
      meeting_id: match.meeting_id,
      meeting_title: meeting?.title || "Meeting",
      meeting_date: meeting?.created_at,
      snippet: summary?.summary?.slice(0, 200) || "",
      similarity: Math.round(match.similarity * 100),
      source: "semantic" as const,
    };
  });

  return NextResponse.json(results);
}
