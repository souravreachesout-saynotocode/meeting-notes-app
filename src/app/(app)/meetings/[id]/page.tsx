"use client";

import { useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Meeting, Transcript, Summary } from "@/types";
import { POLLING_INTERVAL_MS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  MessageSquare,
  Download,
  Loader2,
  CheckCircle2,
  Circle,
  RefreshCw,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface MeetingData extends Meeting {
  transcript?: Transcript;
  summary?: Summary;
}

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const fetchMeeting = async () => {
    const supabase = createClient();
    const [meetingRes, transcriptRes, summaryRes] = await Promise.all([
      supabase.from("meetings").select("*").eq("id", id).single(),
      supabase.from("transcripts").select("*").eq("meeting_id", id).single(),
      supabase.from("summaries").select("*").eq("meeting_id", id).single(),
    ]);

    if (meetingRes.data) {
      setMeeting({
        ...meetingRes.data,
        transcript: transcriptRes.data || undefined,
        summary: summaryRes.data || undefined,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMeeting();
  }, [id]);

  useEffect(() => {
    if (!meeting || meeting.status === "completed" || meeting.status === "error") return;
    const interval = setInterval(fetchMeeting, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [meeting?.status]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  const handleStartEditTitle = () => {
    if (!meeting) return;
    setTitleDraft(meeting.title);
    setEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!meeting || !titleDraft.trim()) return;
    const supabase = createClient();
    await supabase
      .from("meetings")
      .update({ title: titleDraft.trim() })
      .eq("id", id);
    setMeeting({ ...meeting, title: titleDraft.trim() });
    setEditingTitle(false);
  };

  const handleCancelEditTitle = () => {
    setEditingTitle(false);
    setTitleDraft("");
  };

  const handleDelete = async () => {
    if (!confirm("Delete this meeting? This cannot be undone.")) return;
    const supabase = createClient();
    if (meeting?.audio_path) {
      await supabase.storage.from("meeting-audio").remove([meeting.audio_path]);
    }
    await supabase.from("meetings").delete().eq("id", id);
    router.push("/dashboard");
  };

  const handleRetry = async () => {
    const supabase = createClient();
    await supabase.from("meetings").update({ status: "transcribing", error_message: null }).eq("id", id);
    fetch("/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meeting_id: id }),
    });
    fetchMeeting();
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 md:p-10 max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48 bg-white/5" />
        <Skeleton className="h-64 w-full rounded-xl bg-white/5" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex-1 p-6 md:p-10 text-center">
        <p className="text-white/50">Meeting not found</p>
        <Link href="/dashboard">
          <Button variant="link" className="text-white/60">Go back</Button>
        </Link>
      </div>
    );
  }

  const isProcessing = meeting.status === "transcribing" || meeting.status === "summarizing";
  const actionItems = (meeting.summary?.action_items || []) as { text: string; assignee?: string; completed?: boolean }[];
  const keyDecisions = (meeting.summary?.key_decisions || []) as { text: string }[];

  return (
    <div className="flex-1 p-6 md:p-10 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3 mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          {/* Editable title */}
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") handleCancelEditTitle();
                }}
                className="text-2xl font-bold bg-white/5 border border-white/20 rounded-lg px-3 py-1 text-white w-full focus:outline-none focus:border-white/40"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSaveTitle}
                className="text-emerald-400 hover:text-emerald-300 hover:bg-white/10 shrink-0"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancelEditTitle}
                className="text-white/40 hover:text-white hover:bg-white/10 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="group flex items-center gap-2">
              <h1
                className="text-2xl font-bold text-white cursor-pointer hover:text-white/80 transition-colors"
                onClick={handleStartEditTitle}
              >
                {meeting.title}
              </h1>
              <button
                onClick={handleStartEditTitle}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white/60"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="text-sm text-white/40 mt-1">
            {format(new Date(meeting.created_at), "MMMM d, yyyy 'at' h:mm a")}
            {meeting.duration_seconds &&
              ` · ${Math.floor(meeting.duration_seconds / 60)}m ${meeting.duration_seconds % 60}s`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {meeting.status === "completed" && (
            <>
              <Link href={`/meetings/${id}/chat`}>
                <Button size="sm" className="bg-white/10 hover:bg-white/15 text-white border-0">
                  <MessageSquare className="mr-2 h-3.5 w-3.5" />
                  Chat
                </Button>
              </Link>
              <a href={`/api/export/${id}`} download>
                <Button size="sm" className="bg-white/10 hover:bg-white/15 text-white border-0">
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Export
                </Button>
              </a>
            </>
          )}
          {meeting.status === "error" && (
            <Button size="sm" onClick={handleRetry} className="bg-white/10 hover:bg-white/15 text-white border-0">
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Retry
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-white/30 hover:text-red-400 hover:bg-white/10">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Processing status */}
      {isProcessing && (
        <div className="mb-6 flex items-center gap-3 py-4 px-5 rounded-xl bg-white/5 border border-white/10">
          <Loader2 className="h-5 w-5 animate-spin text-white/50" />
          <div>
            <p className="text-sm font-medium text-white/80">
              {meeting.status === "transcribing"
                ? "Transcribing audio..."
                : "Generating summary..."}
            </p>
            <p className="text-xs text-white/40">
              This may take a minute. The page will update automatically.
            </p>
          </div>
        </div>
      )}

      {meeting.status === "error" && (
        <div className="mb-6 py-4 px-5 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm font-medium text-red-400">Processing failed</p>
          <p className="text-xs text-red-400/70">{meeting.error_message}</p>
        </div>
      )}

      {/* Content tabs */}
      {meeting.status === "completed" && (
        <Tabs defaultValue="summary">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="summary" className="text-white/60 data-[state=active]:text-white">Summary</TabsTrigger>
            <TabsTrigger value="transcript" className="text-white/60 data-[state=active]:text-white">Transcript</TabsTrigger>
            <TabsTrigger value="actions" className="text-white/60 data-[state=active]:text-white">
              Actions ({actionItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <div className="mt-4 p-6 rounded-xl bg-white/[0.03] border border-white/10">
              {meeting.summary ? (
                <>
                  <div className="whitespace-pre-wrap text-white/80 text-sm leading-relaxed">
                    {meeting.summary.summary}
                  </div>
                  {keyDecisions.length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold text-white/60 mt-6 mb-3 uppercase tracking-wider">
                        Key Decisions
                      </h3>
                      <ul className="space-y-2">
                        {keyDecisions.map((d, i) => (
                          <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                            <span className="text-white/30 mt-0.5">•</span>
                            {d.text}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              ) : (
                <p className="text-white/30 text-sm">No summary available yet.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="transcript">
            <div className="mt-4 p-6 rounded-xl bg-white/[0.03] border border-white/10">
              {meeting.transcript ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                  {meeting.transcript.content}
                </div>
              ) : (
                <p className="text-white/30 text-sm">No transcript available yet.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="actions">
            <div className="mt-4 p-6 rounded-xl bg-white/[0.03] border border-white/10">
              {actionItems.length > 0 ? (
                <ul className="space-y-3">
                  {actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      {item.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-white/20 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="text-sm text-white/80">{item.text}</p>
                        {item.assignee && (
                          <p className="text-xs text-white/40 mt-0.5">
                            Assigned to: {item.assignee}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white/30 text-sm">No action items identified.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
