import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { transcribeAudio } from "@/lib/openai";
import { AUDIO_BUCKET, MAX_AUDIO_SIZE_BYTES } from "@/lib/constants";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { retryQueue } from "@/lib/retry-queue";
import { trackUsage } from "@/lib/usage";

export const maxDuration = 300; // 5 minutes (Vercel Hobby plan max)

async function splitAudioBlob(blob: Blob, maxSize: number): Promise<Blob[]> {
  const totalSize = blob.size;

  if (totalSize <= maxSize) {
    return [blob];
  }

  // Split into roughly equal chunks under maxSize
  const numChunks = Math.ceil(totalSize / maxSize);
  const chunkSize = Math.ceil(totalSize / numChunks);
  const chunks: Blob[] = [];
  const buffer = await blob.arrayBuffer();

  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, totalSize);
    chunks.push(new Blob([buffer.slice(start, end)], { type: blob.type }));
  }

  return chunks;
}

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
      .select("audio_path, audio_size_bytes")
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

    // Split into chunks if file exceeds Whisper's 25MB limit
    const chunks = await splitAudioBlob(audioData, MAX_AUDIO_SIZE_BYTES);
    const transcriptParts: string[] = [];
    let detectedLanguage = "unknown";

    for (let i = 0; i < chunks.length; i++) {
      const chunkName = chunks.length > 1
        ? `chunk_${i + 1}_of_${chunks.length}.webm`
        : meeting.audio_path;

      const { text, language } = await transcribeAudio(chunks[i], chunkName);
      transcriptParts.push(text);

      if (i === 0) {
        detectedLanguage = language;
      }
    }

    const fullText = transcriptParts.join("\n\n");

    // Save transcript
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

    // Track usage
    const { data: meetingOwner } = await supabase.from("meetings").select("user_id").eq("id", meeting_id).single();
    if (meetingOwner?.user_id) {
      await trackUsage(meetingOwner.user_id, "whisper-transcription", { chunks: chunks.length });
    }

    return NextResponse.json({
      success: true,
      text: fullText,
      language: detectedLanguage,
      chunks: chunks.length,
    });
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
