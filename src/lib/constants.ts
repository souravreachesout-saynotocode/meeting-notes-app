export const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25MB Whisper limit per chunk
export const MAX_RECORDING_SECONDS = 3 * 60 * 60; // 3 hours max
export const AUDIO_MIME_TYPE = "audio/webm;codecs=opus";
export const AUDIO_BUCKET = "meeting-audio";
export const POLLING_INTERVAL_MS = 2000;
export const CHUNK_DURATION_MS = 10 * 60 * 1000; // 10 minute chunks for recording
