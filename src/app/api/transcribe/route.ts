import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const rl = rateLimit(`transcribe:${ip}`, RATE_LIMITS.transcribe);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const body = await request.json();
  const { meeting_id, audio_paths } = body;

  if (!meeting_id) {
    return NextResponse.json({ error: "meeting_id is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Determine audio paths if not provided
  let paths: string[] = audio_paths || [];

  if (paths.length === 0) {
    const { data: meeting } = await supabase
      .from("meetings")
      .select("audio_path")
      .eq("id", meeting_id)
      .single();

    if (!meeting?.audio_path) {
      return NextResponse.json({ error: "No audio file found" }, { status: 404 });
    }
    paths = [meeting.audio_path];
  }

  // Mark as transcribing immediately
  await supabase
    .from("meetings")
    .update({ status: "transcribing", error_message: null })
    .eq("id", meeting_id);

  // Send to Inngest for background processing — returns immediately
  await inngest.send({
    name: "meeting/transcribe.requested",
    data: { meeting_id, audio_paths: paths },
  });

  return NextResponse.json({ success: true, queued: true, segments: paths.length });
}
