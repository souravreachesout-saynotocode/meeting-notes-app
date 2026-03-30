import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-20250514";

export async function summarizeMeeting(transcript: string): Promise<{
  summary: string;
  action_items: { text: string; assignee?: string; due_date?: string; completed: boolean }[];
  key_decisions: { text: string }[];
}> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Analyze this meeting transcript and provide a structured summary.

The transcript may contain Hindi, English, or a mix of both. Summarize in English.

Respond ONLY with a JSON object in this exact format (no markdown, no code fences):
{
  "summary": "A concise 2-4 paragraph summary of the meeting covering main topics discussed, key points, and outcomes.",
  "action_items": [
    {"text": "Description of action item", "assignee": "Person responsible (if mentioned)", "due_date": "Deadline (if mentioned)", "completed": false}
  ],
  "key_decisions": [
    {"text": "Description of decision made"}
  ]
}

TRANSCRIPT:
${transcript}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  return JSON.parse(content.text);
}

export function createChatStream(
  transcript: string,
  messages: { role: "user" | "assistant"; content: string }[]
) {
  return anthropic.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    system: `You are a helpful assistant that answers questions about a meeting transcript.
Answer based on the transcript content. If something isn't covered in the transcript, say so.
The transcript may contain Hindi and English. Respond in the same language as the user's question.

MEETING TRANSCRIPT:
${transcript}`,
    messages,
  });
}

export { anthropic, MODEL };
