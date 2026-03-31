import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createServerClient();

  // Find the public link
  const { data: link } = await supabase
    .from("public_links")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!link) {
    return NextResponse.json(
      { error: "This link does not exist or has been disabled" },
      { status: 404 }
    );
  }

  // Check expiration
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "This link has expired" },
      { status: 410 }
    );
  }

  // Increment view count
  await supabase
    .from("public_links")
    .update({ view_count: (link.view_count || 0) + 1 })
    .eq("id", link.id);

  // Get meeting data
  const { data: meeting } = await supabase
    .from("meetings")
    .select("title, created_at, duration_seconds")
    .eq("id", link.meeting_id)
    .single();

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Get summary
  const { data: summary } = await supabase
    .from("summaries")
    .select("summary, action_items, key_decisions")
    .eq("meeting_id", link.meeting_id)
    .single();

  // Get tags
  const { data: meetingTags } = await supabase
    .from("meeting_tags")
    .select("tag_id")
    .eq("meeting_id", link.meeting_id);

  const tagIds = (meetingTags || []).map((mt) => mt.tag_id);
  const { data: tags } = tagIds.length > 0
    ? await supabase.from("tags").select("name").in("id", tagIds)
    : { data: [] };

  return NextResponse.json({
    title: meeting.title,
    created_at: meeting.created_at,
    duration_seconds: meeting.duration_seconds,
    summary: summary?.summary || null,
    action_items: summary?.action_items || [],
    key_decisions: summary?.key_decisions || [],
    tags: (tags || []).map((t) => t.name),
  });
}
