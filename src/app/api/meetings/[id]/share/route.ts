import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAuthClient } from "@/lib/supabase/server";

// GET: list shares for a meeting
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("meeting_shares")
    .select("*")
    .eq("meeting_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: share a meeting with someone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { email, permission = "view" } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const authSupabase = await createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Check if meeting belongs to user
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Check if already shared
  const { data: existing } = await supabase
    .from("meeting_shares")
    .select("id")
    .eq("meeting_id", id)
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already shared with this email" }, { status: 409 });
  }

  // Find user by email (if they have an account)
  const { data: targetUser } = await supabase
    .from("auth.users")
    .select("id")
    .eq("email", email)
    .single();

  const { data: share, error } = await supabase
    .from("meeting_shares")
    .insert({
      meeting_id: id,
      shared_by: user.id,
      shared_with: targetUser?.id || null,
      email,
      permission,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(share, { status: 201 });
}

// DELETE: remove a share
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { share_id } = await request.json();

  const supabase = createServerClient();

  const { error } = await supabase
    .from("meeting_shares")
    .delete()
    .eq("id", share_id)
    .eq("meeting_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
