import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-20250514";

const TAG_COLORS: Record<string, string> = {
  "product": "#3b82f6",
  "engineering": "#8b5cf6",
  "design": "#ec4899",
  "marketing": "#f97316",
  "sales": "#10b981",
  "finance": "#eab308",
  "hr": "#06b6d4",
  "strategy": "#6366f1",
  "planning": "#14b8a6",
  "review": "#f43f5e",
  "standup": "#84cc16",
  "brainstorm": "#a855f7",
  "onboarding": "#22d3ee",
  "interview": "#fb923c",
  "retro": "#e879f9",
};

export function getTagColor(tagName: string): string {
  const lower = tagName.toLowerCase();
  for (const [key, color] of Object.entries(TAG_COLORS)) {
    if (lower.includes(key)) return color;
  }
  // Hash-based color for unknown tags
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = lower.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 55%)`;
}

export async function summarizeMeeting(transcript: string): Promise<{
  title: string;
  summary: string;
  action_items: { text: string; assignee?: string; due_date?: string; completed: boolean }[];
  key_decisions: { text: string }[];
  tags: string[];
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
  "title": "A short, descriptive title for this meeting (5-10 words max)",
  "summary": "A concise 2-4 paragraph summary of the meeting.",
  "action_items": [
    {"text": "Description of action item", "assignee": "Person responsible (if mentioned)", "due_date": "Deadline (if mentioned)", "completed": false}
  ],
  "key_decisions": [
    {"text": "Description of decision made"}
  ],
  "tags": ["tag1", "tag2", "tag3"]
}

For tags: generate 2-5 short, lowercase topic tags that describe this meeting's content. Examples: "product", "engineering", "standup", "planning", "design-review", "budget", "hiring", "strategy", "client-call", "brainstorm".

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

export async function generateWeeklyDigest(
  meetingSummaries: { title: string; summary: string; date: string; tags: string[] }[]
): Promise<string> {
  const meetingList = meetingSummaries
    .map((m) => `**${m.title}** (${m.date})${m.tags.length > 0 ? ` [${m.tags.join(", ")}]` : ""}\n${m.summary}`)
    .join("\n\n---\n\n");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Generate a weekly digest summarizing these ${meetingSummaries.length} meetings.

Write a concise, actionable digest in this format:
- Start with a 1-2 sentence overview of the week
- Group key themes/topics that came up across meetings
- List the top action items that need follow-up
- Note any important decisions made
- End with a brief "looking ahead" section if applicable

Keep it under 500 words. Write in a professional but friendly tone.

MEETINGS THIS WEEK:

${meetingList}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  return content.text;
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
