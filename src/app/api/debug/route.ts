import { NextResponse } from "next/server";
import { createServerClient, createAuthClient } from "@/lib/supabase/server";

export async function GET() {
  const authSupabase = await createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  const supabase = createServerClient();

  // Check meetings with and without user_id filter
  const { data: allMeetings, count: totalCount } = await supabase
    .from("meetings")
    .select("id, title, user_id, status", { count: "exact" });

  const { data: userMeetings } = user
    ? await supabase
        .from("meetings")
        .select("id, title, user_id")
        .eq("user_id", user.id)
    : { data: [] };

  // Check via anon client (what the dashboard sees)
  const { data: anonMeetings, error: anonError } = await authSupabase
    .from("meetings")
    .select("id, title, user_id");

  return NextResponse.json({
    auth_user_id: user?.id || null,
    auth_email: user?.email || null,
    total_meetings_in_db: totalCount,
    all_meetings: allMeetings?.map((m) => ({ id: m.id, title: m.title, user_id: m.user_id, status: m.status })),
    meetings_matching_user: userMeetings?.length || 0,
    meetings_via_rls: anonMeetings?.length || 0,
    rls_error: anonError?.message || null,
  });
}
