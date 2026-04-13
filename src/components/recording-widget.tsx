"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRecording } from "@/components/recording-provider";
import { createClient } from "@/lib/supabase/client";
import { AUDIO_BUCKET } from "@/lib/constants";
import {
  Square,
  Pause,
  Play,
  Upload,
  Loader2,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function RecordingWidget() {
  const router = useRouter();
  const {
    isRecording,
    isPaused,
    duration,
    audioBlobs,
    recordingTitle,
    recordingMode,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useRecording();

  const [minimized, setMinimized] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasRecording = audioBlobs.length > 0;

  // Don't render if not recording and no completed recording
  if (!isRecording && !hasRecording) return null;

  const handleSave = async () => {
    if (audioBlobs.length === 0) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: meeting, error: meetingError } = await supabase
        .from("meetings")
        .insert({
          title: recordingTitle.trim() || "Untitled Meeting",
          recording_mode: recordingMode,
          status: "transcribing",
          duration_seconds: duration,
          user_id: user?.id,
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      const audioPaths: string[] = [];
      for (let i = 0; i < audioBlobs.length; i++) {
        const path = audioBlobs.length === 1
          ? `${user?.id}/${meeting.id}.webm`
          : `${user?.id}/${meeting.id}_part${i + 1}.webm`;

        const { error: uploadErr } = await supabase.storage
          .from(AUDIO_BUCKET)
          .upload(path, audioBlobs[i], { contentType: "audio/webm", upsert: true });

        if (uploadErr) throw uploadErr;
        audioPaths.push(path);
      }

      const totalSize = audioBlobs.reduce((sum, b) => sum + b.size, 0);
      await supabase
        .from("meetings")
        .update({ audio_path: audioPaths[0], audio_size_bytes: totalSize })
        .eq("id", meeting.id);

      fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meeting.id, audio_paths: audioPaths }),
      });

      resetRecording();
      router.push(`/meetings/${meeting.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  };

  // Minimized view — tiny floating pill
  if (minimized) {
    return (
      <div
        className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/90 text-white shadow-lg cursor-pointer hover:bg-red-500 transition-colors"
        onClick={() => setMinimized(false)}
      >
        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
        <span className="text-sm font-mono font-medium">{formatDuration(duration)}</span>
        <Maximize2 className="h-3 w-3 ml-1" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[100] w-80 bg-[#1c1d22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5">
        <div className="flex items-center gap-2">
          {isRecording && (
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
          <span className="text-xs text-white/60 truncate max-w-[180px]">
            {recordingTitle || "Recording"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="p-1 text-white/30 hover:text-white/60"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          {!isRecording && hasRecording && (
            <button
              onClick={resetRecording}
              className="p-1 text-white/30 hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Timer */}
      <div className="px-4 py-4 text-center">
        <div className="text-3xl font-mono font-light text-white tabular-nums">
          {formatDuration(duration)}
        </div>
        {isRecording && (
          <div className="text-[10px] text-white/20 mt-1">
            Max 3 hours · {formatDuration(10800 - duration)} remaining
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-4 pb-4">
        {isRecording && (
          <>
            {isPaused ? (
              <button
                onClick={resumeRecording}
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
              >
                <Play className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
              >
                <Pause className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={stopRecording}
              className="h-12 w-12 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-400 transition-colors"
            >
              <Square className="h-5 w-5" />
            </button>
          </>
        )}

        {!isRecording && hasRecording && (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-10 rounded-lg bg-white text-black hover:bg-white/90 flex items-center justify-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save & Transcribe"}
            </button>
            <button
              onClick={resetRecording}
              className="h-10 px-4 rounded-lg bg-white/10 text-white/60 hover:bg-white/15 text-sm transition-colors"
            >
              Discard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
