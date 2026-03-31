import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { getUserUsage } from "@/lib/usage";

export async function GET() {
  const authSupabase = await createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const usage = await getUserUsage(user.id);
  return NextResponse.json(usage);
}
