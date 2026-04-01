"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRecording } from "@/components/recording-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mic,
  Monitor,
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
  const searchParams = useSearchParams();
  const {
    isRecording,
    audioBlobs,
    error,
    startRecording,
    setRecordingTitle,
  } = useRecording();

  const [mode, setMode] = useState<RecordingMode>("microphone");
  const initialTitle = searchParams.get("title") || "";
  const [localTitle, setLocalTitle] = useState(initialTitle);

  const [showScreenOption] = useState(
    () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia
  );

  const hasRecording = audioBlobs.length > 0;

  const handleStart = () => {
    setRecordingTitle(localTitle.trim());
    startRecording(localTitle.trim(), mode);
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-xl mx-auto w-full">
      <h1 className="text-xl font-semibold text-white mb-8">New Recording</h1>

      {/* Show message if already recording */}
      {isRecording && (
        <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
          <p className="text-sm text-red-400 font-medium">Recording in progress</p>
          <p className="text-xs text-white/40 mt-1">
            Use the floating widget (bottom-right) to control the recording.
            You can browse other pages while recording.
          </p>
        </div>
      )}

      {hasRecording && !isRecording && (
        <div className="mb-8 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <p className="text-sm text-emerald-400 font-medium">Recording complete</p>
          <p className="text-xs text-white/40 mt-1">
            Use the floating widget (bottom-right) to save or discard.
          </p>
        </div>
      )}

      {/* Title */}
      {!isRecording && !hasRecording && (
        <>
          <div className="mb-8">
            <Input
              placeholder="Meeting title (optional)"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
            />
          </div>

          {/* Recording source toggle */}
          <div className="flex gap-2 mb-10">
            <button
              onClick={() => setMode("microphone")}
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
                onClick={() => setMode("screen")}
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

          {/* Timer placeholder + Start button */}
          <div className="flex flex-col items-center gap-6 py-12">
            <div className="text-6xl font-light text-white/20 tabular-nums tracking-tight">
              {formatDuration(0)}
            </div>

            <Button
              size="lg"
              onClick={handleStart}
              className="bg-white text-black hover:bg-white/90 h-12 px-8"
            >
              <Mic className="mr-2 h-5 w-5" />
              Start Recording
            </Button>

            {mode === "screen" && (
              <p className="text-sm text-white/30 text-center max-w-sm">
                Select a browser tab and check &ldquo;Share tab audio&rdquo;.
                Works best in Chrome/Edge on desktop.
              </p>
            )}
          </div>
        </>
      )}

      {/* Errors */}
      {error && (
        <div className="flex items-center justify-center gap-2 text-red-400 text-sm mt-4">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
