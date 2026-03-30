import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { summarizeMeeting, MODEL } from "@/lib/claude";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
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

    // Mark as completed
    await supabase
      .from("meetings")
      .update({ status: "completed" })
      .eq("id", meeting_id);

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Summarization failed";

    await supabase
      .from("meetings")
      .update({ status: "error", error_message: errorMessage })
      .eq("id", meeting_id);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
