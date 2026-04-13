import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const rl = rateLimit(`summarize:${ip}`, RATE_LIMITS.summarize);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const { meeting_id } = await request.json();

  if (!meeting_id) {
    return NextResponse.json({ error: "meeting_id is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  await supabase
    .from("meetings")
    .update({ status: "summarizing", error_message: null })
    .eq("id", meeting_id);

  // Send to Inngest for background processing
  await inngest.send({
    name: "meeting/summarize.requested",
    data: { meeting_id },
  });

  return NextResponse.json({ success: true, queued: true });
}
