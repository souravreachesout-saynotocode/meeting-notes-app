import { NextResponse } from "next/server";
import { createServerClient, createAuthClient } from "@/lib/supabase/server";
import { generateWeeklyDigest } from "@/lib/claude";
import { format, startOfWeek, endOfWeek } from "date-fns";

export const maxDuration = 120;

export async function GET() {
  const authSupabase = await createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Check for existing digest this week
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const { data: existing } = await supabase
    .from("weekly_digests")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", format(weekStart, "yyyy-MM-dd"))
    .single();

  if (existing) {
    return NextResponse.json(existing);
  }

  return NextResponse.json({ digest: null, message: "No digest yet. POST to generate one." });
}

export async function POST() {
  const authSupabase = await createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServerClient();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  // Get this week's completed meetings
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, title, created_at, status")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("created_at", weekStart.toISOString())
    .lte("created_at", weekEnd.toISOString())
    .order("created_at", { ascending: true });

  if (!meetings || meetings.length === 0) {
    return NextResponse.json(
      { error: "No completed meetings this week to digest" },
      { status: 400 }
    );
  }

  // Get summaries and tags
  const meetingIds = meetings.map((m) => m.id);

  const { data: summariesData } = await supabase
    .from("summaries")
    .select("meeting_id, summary")
    .in("meeting_id", meetingIds);

  const summaryMap = new Map(
    (summariesData || []).map((s) => [s.meeting_id, s.summary])
  );

  // Get tags for meetings
  const { data: meetingTagsData } = await supabase
    .from("meeting_tags")
    .select("meeting_id, tag_id")
    .in("meeting_id", meetingIds);

  const tagIds = [...new Set((meetingTagsData || []).map((mt) => mt.tag_id))];
  const { data: tagsData } = tagIds.length > 0
    ? await supabase.from("tags").select("id, name").in("id", tagIds)
    : { data: [] };

  const tagNameMap = new Map((tagsData || []).map((t) => [t.id, t.name]));
  const tagMap = new Map<string, string[]>();
  for (const mt of meetingTagsData || []) {
    if (!tagMap.has(mt.meeting_id)) tagMap.set(mt.meeting_id, []);
    const name = tagNameMap.get(mt.tag_id);
    if (name) tagMap.get(mt.meeting_id)!.push(name);
  }

  const meetingSummaries = meetings.map((m) => ({
    title: m.title,
    summary: summaryMap.get(m.id) || "",
    date: format(new Date(m.created_at), "EEEE, MMM d"),
    tags: tagMap.get(m.id) || [],
  }));

  // Generate digest with Claude
  const digest = await generateWeeklyDigest(meetingSummaries);

  // Save digest
  const { data: saved } = await supabase
    .from("weekly_digests")
    .upsert(
      {
        user_id: user.id,
        week_start: format(weekStart, "yyyy-MM-dd"),
        week_end: format(weekEnd, "yyyy-MM-dd"),
        digest,
        meeting_count: meetings.length,
      },
      { onConflict: "user_id,week_start" }
    )
    .select()
    .single();

  return NextResponse.json(saved);
}
