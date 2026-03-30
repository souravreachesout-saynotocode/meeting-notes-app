"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useScreenRecorder } from "@/hooks/use-screen-recorder";
import { createClient } from "@/lib/supabase/client";
import { AUDIO_BUCKET } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  // Check screen recording support
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

      // 1. Create meeting record
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

      // 2. Upload audio to storage
      const audioPath = `${meeting.id}.webm`;
      const { error: uploadError } = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(audioPath, audioBlob, {
          contentType: "audio/webm",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 3. Update meeting with audio path
      await supabase
        .from("meetings")
        .update({
          audio_path: audioPath,
          audio_size_bytes: audioBlob.size,
        })
        .eq("id", meeting.id);

      // 4. Trigger transcription
      fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meeting.id }),
      });

      // Navigate to meeting detail
      router.push(`/meetings/${meeting.id}`);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to save recording"
      );
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">New Recording</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Meeting Title</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Enter meeting title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isRecording}
          />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Recording Source</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            variant={mode === "microphone" ? "default" : "outline"}
            onClick={() => !isRecording && setMode("microphone")}
            disabled={isRecording}
            className="flex-1"
          >
            <Mic className="mr-2 h-4 w-4" />
            Microphone
          </Button>
          {showScreenOption && (
            <Button
              variant={mode === "screen" ? "default" : "outline"}
              onClick={() => !isRecording && setMode("screen")}
              disabled={isRecording}
              className="flex-1"
            >
              <Monitor className="mr-2 h-4 w-4" />
              System Audio
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-6 flex flex-col items-center gap-6">
          {/* Timer */}
          <div className="text-5xl font-mono font-bold tabular-nums">
            {formatDuration(duration)}
          </div>

          {/* Status */}
          {isRecording && (
            <Badge variant={isPaused ? "secondary" : "destructive"}>
              {isPaused ? "Paused" : "Recording"}
            </Badge>
          )}
          {audioBlob && !isRecording && (
            <Badge variant="secondary">Recording complete</Badge>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            {!isRecording && !audioBlob && (
              <Button size="lg" onClick={startRecording}>
                <Mic className="mr-2 h-5 w-5" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <>
                {isPaused ? (
                  <Button size="lg" variant="outline" onClick={resumeRecording}>
                    <Play className="mr-2 h-5 w-5" />
                    Resume
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" onClick={pauseRecording}>
                    <Pause className="mr-2 h-5 w-5" />
                    Pause
                  </Button>
                )}
                <Button size="lg" variant="destructive" onClick={stopRecording}>
                  <Square className="mr-2 h-5 w-5" />
                  Stop
                </Button>
              </>
            )}

            {audioBlob && !isRecording && (
              <>
                <Button size="lg" onClick={handleSave} disabled={isUploading}>
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
                >
                  Discard
                </Button>
              </>
            )}
          </div>

          {/* Errors */}
          {(recorderError || uploadError) && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {recorderError || uploadError}
            </div>
          )}

          {/* Hint for screen recording */}
          {mode === "screen" && !isRecording && !audioBlob && (
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Select a browser tab and make sure to check &ldquo;Share tab
              audio&rdquo;. Works best in Chrome/Edge on desktop.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
