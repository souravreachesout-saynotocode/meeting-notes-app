import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const [meetingRes, transcriptRes, summaryRes] = await Promise.all([
    supabase.from("meetings").select("*").eq("id", id).single(),
    supabase.from("transcripts").select("*").eq("meeting_id", id).single(),
    supabase.from("summaries").select("*").eq("meeting_id", id).single(),
  ]);

  if (meetingRes.error || !meetingRes.data) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const meeting = meetingRes.data;
  const transcript = transcriptRes.data;
  const summary = summaryRes.data;

  // Build Granola-style text output
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push(meeting.title);
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(`Date: ${format(new Date(meeting.created_at), "PPP 'at' p")}`);
  lines.push(`Mode: ${meeting.recording_mode === "microphone" ? "In-person (Microphone)" : "Online (System Audio)"}`);
  if (meeting.duration_seconds) {
    const mins = Math.floor(meeting.duration_seconds / 60);
    const secs = meeting.duration_seconds % 60;
    lines.push(`Duration: ${mins}m ${secs}s`);
  }
  lines.push("");

  if (summary) {
    lines.push("-".repeat(60));
    lines.push("SUMMARY");
    lines.push("-".repeat(60));
    lines.push("");
    lines.push(summary.summary);
    lines.push("");

    const actionItems = summary.action_items as { text: string; assignee?: string; completed?: boolean }[];
    if (actionItems && actionItems.length > 0) {
      lines.push("-".repeat(60));
      lines.push("ACTION ITEMS");
      lines.push("-".repeat(60));
      lines.push("");
      for (const item of actionItems) {
        const check = item.completed ? "[x]" : "[ ]";
        const assignee = item.assignee ? ` (@${item.assignee})` : "";
        lines.push(`${check} ${item.text}${assignee}`);
      }
      lines.push("");
    }

    const keyDecisions = summary.key_decisions as { text: string }[];
    if (keyDecisions && keyDecisions.length > 0) {
      lines.push("-".repeat(60));
      lines.push("KEY DECISIONS");
      lines.push("-".repeat(60));
      lines.push("");
      for (const decision of keyDecisions) {
        lines.push(`• ${decision.text}`);
      }
      lines.push("");
    }
  }

  if (transcript) {
    lines.push("-".repeat(60));
    lines.push("FULL TRANSCRIPT");
    lines.push("-".repeat(60));
    lines.push("");
    lines.push(transcript.content);
    lines.push("");
  }

  lines.push("=".repeat(60));
  lines.push("Exported from Meeting Notes App");
  lines.push("=".repeat(60));

  const text = lines.join("\n");
  const filename = `${meeting.title.replace(/[^a-zA-Z0-9]/g, "_")}_${format(new Date(meeting.created_at), "yyyy-MM-dd")}.txt`;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
