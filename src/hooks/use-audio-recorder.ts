"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { MAX_RECORDING_SECONDS } from "@/lib/constants";

// 15 minutes per segment — keeps each file well under 25MB
const SEGMENT_DURATION_MS = 15 * 60 * 1000;

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlobs: Blob[];
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  error: string | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlobs, setAudioBlobs] = useState<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const startNewSegment = useCallback((stream: MediaStream) => {
    // Save previous segment
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
      // Save final chunk data
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

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setDuration(durationRef.current);

      if (durationRef.current >= MAX_RECORDING_SECONDS) {
        stopAll();
      }
    }, 1000);
  }, [stopAll]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlobs([]);
      chunksRef.current = [];
      completedBlobsRef.current = [];
      setDuration(0);
      durationRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });

      streamRef.current = stream;

      // Start first segment
      startNewSegment(stream);

      // Rotate segments every SEGMENT_DURATION_MS
      segmentTimerRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          // Stop current recorder (triggers onstop which won't set audioBlobs since we'll start a new one)
          const currentRecorder = mediaRecorderRef.current;

          // Temporarily override onstop to just save data, not finalize
          currentRecorder.onstop = () => {
            if (chunksRef.current.length > 0) {
              const blob = new Blob(chunksRef.current, { type: "audio/webm" });
              completedBlobsRef.current.push(blob);
              chunksRef.current = [];
            }
            // Start next segment
            if (streamRef.current) {
              startNewSegment(streamRef.current);
            }
          };

          currentRecorder.stop();
        }
      }, SEGMENT_DURATION_MS);

      setIsRecording(true);
      setIsPaused(false);
      startTimer();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to access microphone. Please check permissions."
      );
    }
  }, [startTimer, startNewSegment]);

  const stopRecording = useCallback(() => {
    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // Reset onstop to the final version that sets audioBlobs
      const recorder = mediaRecorderRef.current;
      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          completedBlobsRef.current.push(blob);
          chunksRef.current = [];
        }
        setAudioBlobs([...completedBlobsRef.current]);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
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
    chunksRef.current = [];
    completedBlobsRef.current = [];
  }, [stopAll]);

  useEffect(() => {
    return () => {
      stopTimer();
      if (segmentTimerRef.current) clearInterval(segmentTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stopTimer]);

  return {
    isRecording,
    isPaused,
    duration,
    audioBlobs,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error,
  };
}
