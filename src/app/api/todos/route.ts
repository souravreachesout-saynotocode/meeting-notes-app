import { NextResponse } from "next/server";
import { createServerClient, createAuthClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export const maxDuration = 120;

export async function GET() {
  const authSupabase = await createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Get recent completed meetings with summaries
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, title, created_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(15);

  if (!meetings || meetings.length === 0) {
    return NextResponse.json({ todos: [], message: "No completed meetings found." });
  }

  const meetingIds = meetings.map((m) => m.id);

  const { data: summaries } = await supabase
    .from("summaries")
    .select("meeting_id, action_items")
    .in("meeting_id", meetingIds);

  // Group action items by date and meeting
  const dateGroups: Record<string, { date: string; meetings: { title: string; id: string; items: { text: string; assignee?: string; completed?: boolean }[] }[] }> = {};

  for (const meeting of meetings) {
    const summary = summaries?.find((s) => s.meeting_id === meeting.id);
    const items = (summary?.action_items || []) as { text: string; assignee?: string; completed?: boolean }[];

    if (items.length === 0) continue;

    const dateKey = format(new Date(meeting.created_at), "yyyy-MM-dd");
    const dateLabel = format(new Date(meeting.created_at), "EEEE (EEE, MMM d, yyyy)");

    if (!dateGroups[dateKey]) {
      dateGroups[dateKey] = { date: dateLabel, meetings: [] };
    }

    dateGroups[dateKey].meetings.push({
      title: meeting.title,
      id: meeting.id,
      items,
    });
  }

  // Sort by date descending
  const sortedGroups = Object.entries(dateGroups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, group]) => group);

  return NextResponse.json({ todos: sortedGroups });
}
