import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { transcribeAudio } from "@/lib/openai";
import { AUDIO_BUCKET } from "@/lib/constants";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { trackUsage } from "@/lib/usage";

export const maxDuration = 300;

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
  const baseUrl = request.nextUrl.origin;

  try {
    await supabase
      .from("meetings")
      .update({ status: "transcribing" })
      .eq("id", meeting_id);

    // Determine audio paths
    let paths: string[] = audio_paths || [];

    if (paths.length === 0) {
      const { data: meeting } = await supabase
        .from("meetings")
        .select("audio_path")
        .eq("id", meeting_id)
        .single();

      if (!meeting?.audio_path) {
        throw new Error("No audio file found for this meeting");
      }
      paths = [meeting.audio_path];
    }

    // For single segment: transcribe directly (fast path)
    if (paths.length === 1) {
      const { data: audioData, error: downloadError } = await supabase.storage
        .from(AUDIO_BUCKET)
        .download(paths[0]);

      if (downloadError || !audioData) {
        throw new Error(`Failed to download audio: ${downloadError?.message}`);
      }

      const { text, language } = await transcribeAudio(audioData, paths[0]);
      const wordCount = text.split(/\s+/).filter(Boolean).length;

      await supabase.from("transcripts").upsert(
        { meeting_id, content: text, language, word_count: wordCount },
        { onConflict: "meeting_id" }
      );

      await supabase.from("meetings").update({ status: "summarizing" }).eq("id", meeting_id);

      fetch(`${baseUrl}/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id }),
      });

      const { data: owner } = await supabase.from("meetings").select("user_id").eq("id", meeting_id).single();
      if (owner?.user_id) await trackUsage(owner.user_id, "whisper-transcription");

      return NextResponse.json({ success: true, text, language, segments: 1 });
    }

    // For multiple segments: transcribe first one now, chain the rest
    const { data: audioData, error: downloadError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .download(paths[0]);

    if (downloadError || !audioData) {
      throw new Error(`Failed to download audio segment 1: ${downloadError?.message}`);
    }

    const { text, language } = await transcribeAudio(audioData, paths[0]);

    // Get existing partial transcript (from previous segment calls)
    const { data: existingTranscript } = await supabase
      .from("transcripts")
      .select("content")
      .eq("meeting_id", meeting_id)
      .single();

    const fullText = existingTranscript?.content
      ? existingTranscript.content + "\n\n" + text
      : text;

    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    await supabase.from("transcripts").upsert(
      { meeting_id, content: fullText, language, word_count: wordCount },
      { onConflict: "meeting_id" }
    );

    const remainingPaths = paths.slice(1);

    if (remainingPaths.length > 0) {
      // Chain: call ourselves with remaining segments
      fetch(`${baseUrl}/api/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id, audio_paths: remainingPaths }),
      });

      return NextResponse.json({
        success: true,
        segment: paths.length - remainingPaths.length,
        remaining: remainingPaths.length,
      });
    }

    // All segments done — move to summarization
    await supabase.from("meetings").update({ status: "summarizing" }).eq("id", meeting_id);

    fetch(`${baseUrl}/api/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meeting_id }),
    });

    const { data: owner } = await supabase.from("meetings").select("user_id").eq("id", meeting_id).single();
    if (owner?.user_id) await trackUsage(owner.user_id, "whisper-transcription", { segments: paths.length });

    return NextResponse.json({ success: true, segments: paths.length });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Transcription failed";

    await supabase
      .from("meetings")
      .update({ status: "error", error_message: errorMessage })
      .eq("id", meeting_id);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
