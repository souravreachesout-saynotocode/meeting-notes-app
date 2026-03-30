export type {
  Meeting,
  Transcript,
  Summary,
  ActionItem,
  KeyDecision,
  ChatMessage,
  MeetingStatus,
  RecordingMode,
} from "@/lib/supabase/types";

export interface MeetingWithDetails extends Omit<import("@/lib/supabase/types").Meeting, never> {
  transcript?: import("@/lib/supabase/types").Transcript;
  summary?: import("@/lib/supabase/types").Summary;
}

export interface SearchResult {
  meeting_id: string;
  meeting_title: string;
  meeting_date: string;
  snippet: string;
  source: "transcript" | "summary";
}
