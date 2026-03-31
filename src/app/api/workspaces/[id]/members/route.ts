import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAuthClient } from "@/lib/supabase/server";

// GET: list members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data } = await supabase
    .from("workspace_members")
    .select("user_id, role, joined_at")
    .eq("workspace_id", id);

  return NextResponse.json(data || []);
}

// POST: invite a member by email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { email, role = "member" } = await request.json();

  const authSupabase = await createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Check if user is admin/owner of workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json({ error: "Not authorized to invite members" }, { status: 403 });
  }

  // Find user by email
  const { data: users } = await supabase.auth.admin.listUsers();
  const targetUser = users?.users?.find((u) => u.email === email);

  if (!targetUser) {
    return NextResponse.json({ error: "User not found. They need to sign up first." }, { status: 404 });
  }

  // Add member
  const { error } = await supabase
    .from("workspace_members")
    .upsert({
      workspace_id: id,
      user_id: targetUser.id,
      role,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, user_id: targetUser.id }, { status: 201 });
}
