export type MeetingStatus =
  | "recording"
  | "transcribing"
  | "summarizing"
  | "completed"
  | "error";

export type RecordingMode = "microphone" | "screen";

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  recording_mode: RecordingMode;
  status: MeetingStatus;
  duration_seconds: number | null;
  audio_path: string | null;
  audio_size_bytes: number | null;
  error_message: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transcript {
  id: string;
  meeting_id: string;
  content: string;
  language: string | null;
  word_count: number | null;
  created_at: string;
}

export interface Summary {
  id: string;
  meeting_id: string;
  summary: string;
  action_items: ActionItem[];
  key_decisions: KeyDecision[];
  model_used: string | null;
  created_at: string;
}

export interface ActionItem {
  text: string;
  assignee?: string;
  due_date?: string;
  completed: boolean;
}

export interface KeyDecision {
  text: string;
}

export interface ChatMessage {
  id: string;
  meeting_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface Folder {
  id: string;
  name: string;
  icon: string;
  created_at: string;
  updated_at: string;
}
