"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Meeting, Transcript, Summary } from "@/types";
import { POLLING_INTERVAL_MS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  // Poll for status updates if not completed
  useEffect(() => {
    if (!meeting || meeting.status === "completed" || meeting.status === "error") return;

    const interval = setInterval(fetchMeeting, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [meeting?.status]);

  const handleDelete = async () => {
    if (!confirm("Delete this meeting? This cannot be undone.")) return;
    const supabase = createClient();
    if (meeting?.audio_path) {
      await supabase.storage.from("meeting-audio").remove([meeting.audio_path]);
    }
    await supabase.from("meetings").delete().eq("id", id);
    router.push("/");
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
      <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex-1 p-4 md:p-8 text-center">
        <p className="text-muted-foreground">Meeting not found</p>
        <Link href="/">
          <Button variant="link">Go back</Button>
        </Link>
      </div>
    );
  }

  const isProcessing = meeting.status === "transcribing" || meeting.status === "summarizing";
  const actionItems = (meeting.summary?.action_items || []) as { text: string; assignee?: string; completed?: boolean }[];
  const keyDecisions = (meeting.summary?.key_decisions || []) as { text: string }[];

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(meeting.created_at), "MMMM d, yyyy 'at' h:mm a")}
            {meeting.duration_seconds &&
              ` · ${Math.floor(meeting.duration_seconds / 60)}m ${meeting.duration_seconds % 60}s`}
          </p>
        </div>
        <div className="flex gap-2">
          {meeting.status === "completed" && (
            <>
              <Link href={`/meetings/${id}/chat`}>
                <Button variant="outline" size="sm">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Chat
                </Button>
              </Link>
              <a href={`/api/export/${id}`} download>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </a>
            </>
          )}
          {meeting.status === "error" && (
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Processing status */}
      {isProcessing && (
        <Card className="mb-6">
          <CardContent className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">
                {meeting.status === "transcribing"
                  ? "Transcribing audio..."
                  : "Generating summary..."}
              </p>
              <p className="text-sm text-muted-foreground">
                This may take a minute. The page will update automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {meeting.status === "error" && (
        <Card className="mb-6 border-destructive">
          <CardContent className="py-4 text-destructive">
            <p className="font-medium">Processing failed</p>
            <p className="text-sm">{meeting.error_message}</p>
          </CardContent>
        </Card>
      )}

      {/* Content tabs */}
      {meeting.status === "completed" && (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="actions">
              Actions ({actionItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card>
              <CardContent className="pt-6 prose prose-sm max-w-none dark:prose-invert">
                {meeting.summary ? (
                  <>
                    <div className="whitespace-pre-wrap">
                      {meeting.summary.summary}
                    </div>
                    {keyDecisions.length > 0 && (
                      <>
                        <h3 className="text-base font-semibold mt-6 mb-3">
                          Key Decisions
                        </h3>
                        <ul className="space-y-1">
                          {keyDecisions.map((d, i) => (
                            <li key={i}>{d.text}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    No summary available yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transcript">
            <Card>
              <CardContent className="pt-6">
                {meeting.transcript ? (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {meeting.transcript.content}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No transcript available yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions">
            <Card>
              <CardContent className="pt-6">
                {actionItems.length > 0 ? (
                  <ul className="space-y-3">
                    {actionItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        {item.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm">{item.text}</p>
                          {item.assignee && (
                            <p className="text-xs text-muted-foreground">
                              Assigned to: {item.assignee}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    No action items identified.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
