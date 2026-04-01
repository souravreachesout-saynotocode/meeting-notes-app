"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { MAX_RECORDING_SECONDS } from "@/lib/constants";

const SEGMENT_DURATION_MS = 15 * 60 * 1000;

interface RecordingContextValue {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlobs: Blob[];
  recordingTitle: string;
  recordingMode: "microphone" | "screen";
  error: string | null;
  startRecording: (title?: string, mode?: "microphone" | "screen") => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  setRecordingTitle: (title: string) => void;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

export function useRecording() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error("useRecording must be used within RecordingProvider");
  return ctx;
}

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlobs, setAudioBlobs] = useState<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recordingTitle, setRecordingTitle] = useState("");
  const [recordingMode, setRecordingMode] = useState<"microphone" | "screen">("microphone");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const segmentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef(0);
  const completedBlobsRef = useRef<Blob[]>([]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const saveCurrentSegment = useCallback(() => {
    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      completedBlobsRef.current.push(blob);
      chunksRef.current = [];
    }
  }, []);

  const startNewSegment = useCallback((stream: MediaStream) => {
    saveCurrentSegment();

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        completedBlobsRef.current.push(blob);
        chunksRef.current = [];
      }
      setAudioBlobs([...completedBlobsRef.current]);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(10000);
  }, [saveCurrentSegment]);

  const stopAll = useCallback(() => {
    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
    stopTimer();
  }, [stopTimer]);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setDuration(durationRef.current);
      if (durationRef.current >= MAX_RECORDING_SECONDS) {
        stopAll();
      }
    }, 1000);
  }, [stopAll]);

  const startRecording = useCallback(async (title?: string, mode?: "microphone" | "screen") => {
    try {
      setError(null);
      setAudioBlobs([]);
      chunksRef.current = [];
      completedBlobsRef.current = [];
      setDuration(0);
      durationRef.current = 0;
      if (title) setRecordingTitle(title);
      if (mode) setRecordingMode(mode);

      const actualMode = mode || "microphone";
      let stream: MediaStream;

      if (actualMode === "screen") {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          stream.getTracks().forEach((t) => t.stop());
          setError("No audio track. Check 'Share tab audio'.");
          return;
        }
        stream.getVideoTracks().forEach((t) => t.stop());
        stream = new MediaStream(audioTracks);
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
        });
      }

      streamRef.current = stream;
      startNewSegment(stream);

      segmentTimerRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          const currentRecorder = mediaRecorderRef.current;
          currentRecorder.onstop = () => {
            if (chunksRef.current.length > 0) {
              const blob = new Blob(chunksRef.current, { type: "audio/webm" });
              completedBlobsRef.current.push(blob);
              chunksRef.current = [];
            }
            if (streamRef.current) startNewSegment(streamRef.current);
          };
          currentRecorder.stop();
        }
      }, SEGMENT_DURATION_MS);

      setIsRecording(true);
      setIsPaused(false);
      startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording");
    }
  }, [startTimer, startNewSegment]);

  const stopRecording = useCallback(() => {
    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      const recorder = mediaRecorderRef.current;
      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          completedBlobsRef.current.push(blob);
          chunksRef.current = [];
        }
        setAudioBlobs([...completedBlobsRef.current]);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };
      recorder.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
    stopTimer();
  }, [stopTimer]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
    }
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    }
  }, [startTimer]);

  const resetRecording = useCallback(() => {
    stopAll();
    setAudioBlobs([]);
    setDuration(0);
    durationRef.current = 0;
    setError(null);
    setRecordingTitle("");
    chunksRef.current = [];
    completedBlobsRef.current = [];
  }, [stopAll]);

  useEffect(() => {
    return () => {
      stopTimer();
      if (segmentTimerRef.current) clearInterval(segmentTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stopTimer]);

  return (
    <RecordingContext.Provider
      value={{
        isRecording, isPaused, duration, audioBlobs, recordingTitle, recordingMode, error,
        startRecording, stopRecording, pauseRecording, resumeRecording, resetRecording, setRecordingTitle,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
}
