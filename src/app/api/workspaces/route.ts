import { NextResponse } from "next/server";
import { createServerClient, createAuthClient } from "@/lib/supabase/server";

export async function GET() {
  const authSupabase = await createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Get workspaces the user belongs to
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    return NextResponse.json([]);
  }

  const wsIds = memberships.map((m) => m.workspace_id);
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .in("id", wsIds);

  const roleMap = new Map(memberships.map((m) => [m.workspace_id, m.role]));

  const result = (workspaces || []).map((ws) => ({
    ...ws,
    role: roleMap.get(ws.id) || "member",
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const authSupabase = await createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { name, icon } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Create workspace
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({ name: name.trim(), icon: icon || "🏢", owner_id: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add owner as member
  await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: user.id, role: "owner" });

  return NextResponse.json(workspace, { status: 201 });
}
