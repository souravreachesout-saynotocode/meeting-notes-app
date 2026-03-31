import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { summarizeMeeting, MODEL, getTagColor } from "@/lib/claude";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { retryQueue } from "@/lib/retry-queue";
import { trackUsage } from "@/lib/usage";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const rl = rateLimit(`summarize:${ip}`, RATE_LIMITS.summarize);
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
    await supabase
      .from("meetings")
      .update({ status: "summarizing" })
      .eq("id", meeting_id);

    // Get transcript
    const { data: transcript, error: transcriptError } = await supabase
      .from("transcripts")
      .select("content")
      .eq("meeting_id", meeting_id)
      .single();

    if (transcriptError || !transcript) {
      throw new Error("No transcript found for this meeting");
    }

    // Summarize with Claude
    const result = await summarizeMeeting(transcript.content);

    // Save summary
    await supabase.from("summaries").upsert(
      {
        meeting_id,
        summary: result.summary,
        action_items: result.action_items,
        key_decisions: result.key_decisions,
        model_used: MODEL,
      },
      { onConflict: "meeting_id" }
    );

    // Mark as completed + update AI-generated title
    const currentMeeting = await supabase
      .from("meetings")
      .select("title")
      .eq("id", meeting_id)
      .single();

    const updateData: Record<string, string> = { status: "completed" };
    // Only set AI title if user hasn't set a custom one
    if (
      result.title &&
      (!currentMeeting.data?.title ||
        currentMeeting.data.title === "Untitled Meeting")
    ) {
      updateData.title = result.title;
    }

    await supabase
      .from("meetings")
      .update(updateData)
      .eq("id", meeting_id);

    // Save AI-generated tags
    if (result.tags && result.tags.length > 0) {
      for (const tagName of result.tags) {
        // Upsert tag
        const { data: tag } = await supabase
          .from("tags")
          .upsert({ name: tagName.toLowerCase(), color: getTagColor(tagName) }, { onConflict: "name" })
          .select("id")
          .single();

        if (tag) {
          await supabase
            .from("meeting_tags")
            .upsert({ meeting_id, tag_id: tag.id }, { onConflict: "meeting_id,tag_id" });
        }
      }
    }

    // Generate embedding for semantic search
    try {
      const embeddingText = `${result.title}\n${result.summary}\n${result.tags?.join(", ") || ""}`;
      const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: embeddingText,
        }),
      });

      if (embeddingRes.ok) {
        const embData = await embeddingRes.json();
        const embedding = embData.data[0].embedding;

        await supabase.from("embeddings").upsert(
          {
            meeting_id,
            content: embeddingText,
            embedding: JSON.stringify(embedding),
          },
          { onConflict: "meeting_id" }
        );
      }
    } catch {
      // Embedding generation is non-critical, don't fail the whole flow
    }

    // Track usage
    const { data: meetingOwner } = await supabase.from("meetings").select("user_id").eq("id", meeting_id).single();
    if (meetingOwner?.user_id) {
      await trackUsage(meetingOwner.user_id, "claude-summarize");
      if (result.tags?.length) await trackUsage(meetingOwner.user_id, "openai-embedding");
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Summarization failed";

    await supabase
      .from("meetings")
      .update({ status: "error", error_message: errorMessage })
      .eq("id", meeting_id);

    // Add to retry queue
    retryQueue.setBaseUrl(request.nextUrl.origin);
    const willRetry = retryQueue.add(meeting_id, "summarize");

    return NextResponse.json(
      { error: errorMessage, willRetry },
      { status: 500 }
    );
  }
}
