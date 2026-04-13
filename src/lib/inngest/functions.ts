import { inngest } from "./client";
import { createServerClient } from "@/lib/supabase/server";
import { transcribeAudio } from "@/lib/openai";
import { summarizeMeeting, MODEL, getTagColor } from "@/lib/claude";
import { AUDIO_BUCKET } from "@/lib/constants";
import { trackUsage } from "@/lib/usage";

// Transcribe a single segment as a step so Inngest can retry it independently
export const transcribeMeeting = inngest.createFunction(
  {
    id: "transcribe-meeting",
    name: "Transcribe Meeting",
    retries: 3,
    concurrency: { limit: 3 },
    triggers: [{ event: "meeting/transcribe.requested" }],
  },
  async ({ event, step }) => {
    const { meeting_id, audio_paths } = event.data as {
      meeting_id: string;
      audio_paths: string[];
    };

    // Step 1: mark as transcribing
    await step.run("mark-transcribing", async () => {
      const supabase = createServerClient();
      await supabase
        .from("meetings")
        .update({ status: "transcribing" })
        .eq("id", meeting_id);
    });

    // Step 2: transcribe each segment (each step has its own retry + timeout)
    const transcriptParts: string[] = [];
    let detectedLanguage = "unknown";

    for (let i = 0; i < audio_paths.length; i++) {
      const segmentResult = await step.run(`transcribe-segment-${i + 1}`, async () => {
        const supabase = createServerClient();
        const { data: audioData, error: downloadError } = await supabase.storage
          .from(AUDIO_BUCKET)
          .download(audio_paths[i]);

        if (downloadError || !audioData) {
          throw new Error(`Failed to download segment ${i + 1}: ${downloadError?.message}`);
        }

        const { text, language } = await transcribeAudio(audioData, audio_paths[i]);
        return { text, language };
      });

      transcriptParts.push(segmentResult.text);
      if (i === 0) detectedLanguage = segmentResult.language;
    }

    const fullText = transcriptParts.join("\n\n");

    // Step 3: save transcript
    await step.run("save-transcript", async () => {
      const supabase = createServerClient();
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
    });

    // Step 4: track usage
    await step.run("track-usage", async () => {
      const supabase = createServerClient();
      const { data: meeting } = await supabase
        .from("meetings")
        .select("user_id")
        .eq("id", meeting_id)
        .single();
      if (meeting?.user_id) {
        await trackUsage(meeting.user_id, "whisper-transcription", { segments: audio_paths.length });
      }
    });

    // Step 5: trigger summarization
    await step.sendEvent("trigger-summarize", {
      name: "meeting/summarize.requested",
      data: { meeting_id },
    });

    return { success: true, segments: audio_paths.length, text_length: fullText.length };
  }
);

export const summarizeMeetingFn = inngest.createFunction(
  {
    id: "summarize-meeting",
    name: "Summarize Meeting",
    retries: 3,
    triggers: [{ event: "meeting/summarize.requested" }],
  },
  async ({ event, step }) => {
    const { meeting_id } = event.data as { meeting_id: string };

    // Step 1: get transcript
    const transcript = await step.run("get-transcript", async () => {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from("transcripts")
        .select("content")
        .eq("meeting_id", meeting_id)
        .single();
      if (error || !data) throw new Error("Transcript not found");
      return data.content;
    });

    // Step 2: call Claude for summary
    const result = await step.run("generate-summary", async () => {
      return await summarizeMeeting(transcript);
    });

    // Step 3: save summary
    await step.run("save-summary", async () => {
      const supabase = createServerClient();

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

      // Update title if not customized
      const { data: currentMeeting } = await supabase
        .from("meetings")
        .select("title")
        .eq("id", meeting_id)
        .single();

      const updateData: Record<string, string> = { status: "completed" };
      if (
        result.title &&
        (!currentMeeting?.title || currentMeeting.title === "Untitled Meeting")
      ) {
        updateData.title = result.title;
      }

      await supabase.from("meetings").update(updateData).eq("id", meeting_id);
    });

    // Step 4: save tags
    await step.run("save-tags", async () => {
      if (!result.tags || result.tags.length === 0) return;
      const supabase = createServerClient();

      for (const tagName of result.tags) {
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
    });

    // Step 5: generate embedding (non-critical)
    await step.run("generate-embedding", async () => {
      try {
        const embeddingText = `${result.title}\n${result.summary}\n${result.tags?.join(", ") || ""}`;
        const embRes = await fetch("https://api.openai.com/v1/embeddings", {
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

        if (embRes.ok) {
          const embData = await embRes.json();
          const supabase = createServerClient();
          await supabase.from("embeddings").upsert(
            {
              meeting_id,
              content: embeddingText,
              embedding: JSON.stringify(embData.data[0].embedding),
            },
            { onConflict: "meeting_id" }
          );
        }
      } catch {
        // Non-critical — ignore
      }
    });

    // Step 6: track usage
    await step.run("track-usage", async () => {
      const supabase = createServerClient();
      const { data: meeting } = await supabase
        .from("meetings")
        .select("user_id")
        .eq("id", meeting_id)
        .single();
      if (meeting?.user_id) {
        await trackUsage(meeting.user_id, "claude-summarize");
        if (result.tags?.length) await trackUsage(meeting.user_id, "openai-embedding");
      }
    });

    return { success: true, title: result.title };
  }
);
