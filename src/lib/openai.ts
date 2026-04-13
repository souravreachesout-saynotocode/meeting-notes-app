import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Common Whisper hallucinations to filter out
const HALLUCINATION_PATTERNS = [
  /i hope you enjoy(ed)? this video/i,
  /thanks for watching/i,
  /please like and subscribe/i,
  /don't forget to subscribe/i,
  /see you (in the )?next (video|one)/i,
];

function cleanHallucinations(text: string): string {
  // If text contains repeated hallucination phrases (>3 occurrences), return empty
  for (const pattern of HALLUCINATION_PATTERNS) {
    const matches = text.match(new RegExp(pattern.source, "gi"));
    if (matches && matches.length > 3) {
      return "";
    }
  }

  // Remove individual hallucination lines
  return text
    .split(/[.!?]+/)
    .filter((sentence) => {
      return !HALLUCINATION_PATTERNS.some((p) => p.test(sentence.trim()));
    })
    .join(". ")
    .trim();
}

export async function transcribeAudio(
  file: File | Blob,
  filename: string = "audio.webm"
): Promise<{ text: string; language: string }> {
  const transcription = await openai.audio.transcriptions.create({
    file: new File([file], filename),
    model: "whisper-1",
    response_format: "verbose_json",
    // Clear context prompt helps reduce hallucinations
    prompt: "A business meeting recording. The transcript may include English, Hindi, and other languages.",
    // Temperature 0 = most literal, less creative/hallucinated output
    temperature: 0,
  });

  const rawText = transcription.text || "";
  const cleanedText = cleanHallucinations(rawText);

  // Check segments for no-speech probability (from verbose_json)
  // If most segments have high no-speech probability, it's likely silence
  const segments = (transcription as unknown as {
    segments?: { no_speech_prob: number; text: string }[];
  }).segments;

  let finalText = cleanedText;

  if (segments && segments.length > 0) {
    const validSegments = segments.filter((s) => s.no_speech_prob < 0.6);
    if (validSegments.length === 0) {
      finalText = ""; // All segments are likely silence
    } else if (validSegments.length / segments.length < 0.3) {
      // More than 70% of segments are silence — use only valid ones
      finalText = cleanHallucinations(validSegments.map((s) => s.text).join(" "));
    }
  }

  return {
    text: finalText || "[No clear speech detected in this segment]",
    language: (transcription as unknown as { language: string }).language || "unknown",
  };
}

export { openai };
