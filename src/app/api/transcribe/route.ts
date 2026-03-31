import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { transcribeAudio } from "@/lib/openai";
import { AUDIO_BUCKET } from "@/lib/constants";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { retryQueue } from "@/lib/retry-queue";

export const maxDuration = 300; // 5 minutes timeout

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const rl = rateLimit(`transcribe:${ip}`, RATE_LIMITS.transcribe);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const { meeting_id } = await request.json();

  if (!meeting_id) {
    return NextResponse.json(
      { error: "meeting_id is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  try {
    // Update status to transcribing
    await supabase
      .from("meetings")
      .update({ status: "transcribing" })
      .eq("id", meeting_id);

    // Get audio file from storage
    const { data: meeting } = await supabase
      .from("meetings")
      .select("audio_path")
      .eq("id", meeting_id)
      .single();

    if (!meeting?.audio_path) {
      throw new Error("No audio file found for this meeting");
    }

    const { data: audioData, error: downloadError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .download(meeting.audio_path);

    if (downloadError || !audioData) {
      throw new Error(`Failed to download audio: ${downloadError?.message}`);
    }

    // Transcribe with Whisper
    const { text, language } = await transcribeAudio(
      audioData,
      meeting.audio_path
    );

    // Save transcript
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    await supabase.from("transcripts").upsert(
      {
        meeting_id,
        content: text,
        language,
        word_count: wordCount,
      },
      { onConflict: "meeting_id" }
    );

    // Update status to summarizing
    await supabase
      .from("meetings")
      .update({ status: "summarizing" })
      .eq("id", meeting_id);

    // Trigger summarization
    const baseUrl = request.nextUrl.origin;
    fetch(`${baseUrl}/api/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meeting_id }),
    });

    return NextResponse.json({ success: true, text, language });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Transcription failed";

    await supabase
      .from("meetings")
      .update({ status: "error", error_message: errorMessage })
      .eq("id", meeting_id);

    // Add to retry queue
    retryQueue.setBaseUrl(request.nextUrl.origin);
    const willRetry = retryQueue.add(meeting_id, "transcribe");

    return NextResponse.json(
      { error: errorMessage, willRetry },
      { status: 500 }
    );
  }
}
