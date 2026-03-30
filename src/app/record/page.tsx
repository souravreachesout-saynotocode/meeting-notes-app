"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useScreenRecorder } from "@/hooks/use-screen-recorder";
import { createClient } from "@/lib/supabase/client";
import { AUDIO_BUCKET } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mic,
  Monitor,
  Square,
  Pause,
  Play,
  Upload,
  Loader2,
  AlertCircle,
} from "lucide-react";

type RecordingMode = "microphone" | "screen";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function RecordPage() {
  const router = useRouter();
  const [mode, setMode] = useState<RecordingMode>("microphone");
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const micRecorder = useAudioRecorder();
  const screenRecorder = useScreenRecorder();

  const recorder = mode === "microphone" ? micRecorder : screenRecorder;
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error: recorderError,
  } = recorder;

  const [showScreenOption, setShowScreenOption] = useState(false);
  useEffect(() => {
    setShowScreenOption(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getDisplayMedia
    );
  }, []);

  const handleSave = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const supabase = createClient();

      const { data: meeting, error: meetingError } = await supabase
        .from("meetings")
        .insert({
          title: title.trim() || "Untitled Meeting",
          recording_mode: mode,
          status: "transcribing",
          duration_seconds: duration,
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      const audioPath = `${meeting.id}.webm`;
      const { error: storageError } = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(audioPath, audioBlob, {
          contentType: "audio/webm",
          upsert: true,
        });

      if (storageError) throw storageError;

      await supabase
        .from("meetings")
        .update({
          audio_path: audioPath,
          audio_size_bytes: audioBlob.size,
        })
        .eq("id", meeting.id);

      fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meeting.id }),
      });

      router.push(`/meetings/${meeting.id}`);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to save recording"
      );
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-xl mx-auto w-full">
      <h1 className="text-xl font-semibold text-white mb-8">New Recording</h1>

      {/* Title */}
      <div className="mb-8">
        <Input
          placeholder="Meeting title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isRecording}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
        />
      </div>

      {/* Recording source toggle */}
      <div className="flex gap-2 mb-10">
        <button
          onClick={() => !isRecording && setMode("microphone")}
          disabled={isRecording}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === "microphone"
              ? "bg-white text-black"
              : "bg-white/5 text-white/60 hover:bg-white/10"
          }`}
        >
          <Mic className="h-4 w-4" />
          Microphone
        </button>
        {showScreenOption && (
          <button
            onClick={() => !isRecording && setMode("screen")}
            disabled={isRecording}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === "screen"
                ? "bg-white text-black"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            <Monitor className="h-4 w-4" />
            System Audio
          </button>
        )}
      </div>

      {/* Timer */}
      <div className="flex flex-col items-center gap-6 py-12">
        <div className="text-6xl font-light text-white tabular-nums tracking-tight">
          {formatDuration(duration)}
        </div>

        {/* Status */}
        {isRecording && (
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
              }`}
            />
            <span className="text-sm text-white/50">
              {isPaused ? "Paused" : "Recording"}
            </span>
          </div>
        )}
        {audioBlob && !isRecording && (
          <span className="text-sm text-white/50">Recording complete</span>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {!isRecording && !audioBlob && (
            <Button
              size="lg"
              onClick={startRecording}
              className="bg-white text-black hover:bg-white/90 h-12 px-8"
            >
              <Mic className="mr-2 h-5 w-5" />
              Start Recording
            </Button>
          )}

          {isRecording && (
            <>
              {isPaused ? (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={resumeRecording}
                  className="border-white/20 text-white hover:bg-white/10 h-12"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Resume
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={pauseRecording}
                  className="border-white/20 text-white hover:bg-white/10 h-12"
                >
                  <Pause className="mr-2 h-5 w-5" />
                  Pause
                </Button>
              )}
              <Button
                size="lg"
                onClick={stopRecording}
                className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0 h-12"
              >
                <Square className="mr-2 h-5 w-5" />
                Stop
              </Button>
            </>
          )}

          {audioBlob && !isRecording && (
            <>
              <Button
                size="lg"
                onClick={handleSave}
                disabled={isUploading}
                className="bg-white text-black hover:bg-white/90 h-12 px-8"
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-5 w-5" />
                )}
                {isUploading ? "Saving..." : "Save & Transcribe"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={resetRecording}
                disabled={isUploading}
                className="border-white/20 text-white hover:bg-white/10 h-12"
              >
                Discard
              </Button>
            </>
          )}
        </div>

        {/* Errors */}
        {(recorderError || uploadError) && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            {recorderError || uploadError}
          </div>
        )}

        {/* Hint */}
        {mode === "screen" && !isRecording && !audioBlob && (
          <p className="text-sm text-white/30 text-center max-w-sm">
            Select a browser tab and check &ldquo;Share tab audio&rdquo;.
            Works best in Chrome/Edge on desktop.
          </p>
        )}
      </div>
    </div>
  );
}
