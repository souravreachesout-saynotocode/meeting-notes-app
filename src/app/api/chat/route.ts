import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createChatStream } from "@/lib/claude";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { meeting_id, message } = await request.json();

  if (!meeting_id || !message) {
    return new Response(
      JSON.stringify({ error: "meeting_id and message are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createServerClient();

  // Get transcript
  const { data: transcript } = await supabase
    .from("transcripts")
    .select("content")
    .eq("meeting_id", meeting_id)
    .single();

  if (!transcript) {
    return new Response(
      JSON.stringify({ error: "No transcript found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Get chat history
  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("meeting_id", meeting_id)
    .order("created_at", { ascending: true })
    .limit(20);

  // Save user message
  await supabase.from("chat_messages").insert({
    meeting_id,
    role: "user",
    content: message,
  });

  // Build messages array
  const messages = [
    ...(history || []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  // Stream response from Claude
  const stream = createChatStream(transcript.content, messages);

  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const encoder = new TextEncoder();

        stream.on("text", (text) => {
          fullResponse += text;
          controller.enqueue(encoder.encode(text));
        });

        await stream.finalMessage();

        // Save assistant message
        await supabase.from("chat_messages").insert({
          meeting_id,
          role: "assistant",
          content: fullResponse,
        });

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
