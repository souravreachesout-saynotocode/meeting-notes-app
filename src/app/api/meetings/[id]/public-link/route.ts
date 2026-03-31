import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAuthClient } from "@/lib/supabase/server";

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 10; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// GET: get public link for a meeting
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data } = await supabase
    .from("public_links")
    .select("*")
    .eq("meeting_id", id)
    .single();

  return NextResponse.json(data || { exists: false });
}

// POST: create a public link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authSupabase = await createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Check ownership
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Check existing
  const { data: existing } = await supabase
    .from("public_links")
    .select("*")
    .eq("meeting_id", id)
    .single();

  if (existing) {
    // Re-enable if disabled
    if (!existing.is_active) {
      const { data: updated } = await supabase
        .from("public_links")
        .update({ is_active: true })
        .eq("id", existing.id)
        .select()
        .single();
      return NextResponse.json(updated);
    }
    return NextResponse.json(existing);
  }

  const { data: link, error } = await supabase
    .from("public_links")
    .insert({
      meeting_id: id,
      slug: generateSlug(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(link, { status: 201 });
}

// DELETE: disable public link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("public_links")
    .update({ is_active: false })
    .eq("meeting_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
