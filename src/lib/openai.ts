import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(
  file: File | Blob,
  filename: string = "audio.webm"
): Promise<{ text: string; language: string }> {
  const transcription = await openai.audio.transcriptions.create({
    file: new File([file], filename),
    model: "whisper-1",
    response_format: "verbose_json",
    prompt: "This meeting contains Hindi and English.",
  });

  return {
    text: transcription.text,
    language: (transcription as unknown as { language: string }).language || "unknown",
  };
}

export { openai };
