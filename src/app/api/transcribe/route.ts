import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { transcribeAudio } from "@/lib/openai";
import { AUDIO_BUCKET } from "@/lib/constants";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { retryQueue } from "@/lib/retry-queue";
import { trackUsage } from "@/lib/usage";

export const maxDuration = 300; // 5 minutes (Vercel Hobby plan max)

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const rl = rateLimit(`transcribe:${ip}`, RATE_LIMITS.transcribe);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const body = await request.json();
  const { meeting_id, audio_paths } = body;

  if (!meeting_id) {
    return NextResponse.json(
      { error: "meeting_id is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  try {
    await supabase
      .from("meetings")
      .update({ status: "transcribing" })
      .eq("id", meeting_id);

    // Determine audio paths to transcribe
    let paths: string[] = audio_paths || [];

    if (paths.length === 0) {
      // Fallback: get path from meeting record
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

    // Transcribe each segment and concatenate
    const transcriptParts: string[] = [];
    let detectedLanguage = "unknown";

    for (let i = 0; i < paths.length; i++) {
      const { data: audioData, error: downloadError } = await supabase.storage
        .from(AUDIO_BUCKET)
        .download(paths[i]);

      if (downloadError || !audioData) {
        throw new Error(`Failed to download audio segment ${i + 1}: ${downloadError?.message}`);
      }

      const { text, language } = await transcribeAudio(audioData, paths[i]);
      transcriptParts.push(text);

      if (i === 0) detectedLanguage = language;
    }

    const fullText = transcriptParts.join("\n\n");
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    await supabase.from("transcripts").upsert(
      {
        meeting_id,
        content: fullText,
        language: detectedLanguage,
        word_count: wordCount,
      },
      { onConflict: "meeting_id" }
    );

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

    // Track usage
    const { data: meetingOwner } = await supabase.from("meetings").select("user_id").eq("id", meeting_id).single();
    if (meetingOwner?.user_id) {
      await trackUsage(meetingOwner.user_id, "whisper-transcription", { segments: paths.length });
    }

    return NextResponse.json({
      success: true,
      text: fullText,
      language: detectedLanguage,
      segments: paths.length,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Transcription failed";

    await supabase
      .from("meetings")
      .update({ status: "error", error_message: errorMessage })
      .eq("id", meeting_id);

    retryQueue.setBaseUrl(request.nextUrl.origin);
    const willRetry = retryQueue.add(meeting_id, "transcribe");

    return NextResponse.json(
      { error: errorMessage, willRetry },
      { status: 500 }
    );
  }
}
