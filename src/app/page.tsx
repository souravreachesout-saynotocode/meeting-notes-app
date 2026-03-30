"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Meeting } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic, Monitor, Plus, AlertCircle } from "lucide-react";

const statusColors: Record<string, string> = {
  recording: "bg-red-500/10 text-red-600 border-red-200",
  transcribing: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  summarizing: "bg-blue-500/10 text-blue-600 border-blue-200",
  completed: "bg-green-500/10 text-green-600 border-green-200",
  error: "bg-red-500/10 text-red-600 border-red-200",
};

export default function HomePage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMeetings() {
      const supabase = createClient();
      const { data } = await supabase
        .from("meetings")
        .select("*")
        .order("created_at", { ascending: false });

      setMeetings(data || []);
      setLoading(false);
    }
    fetchMeetings();
  }, []);

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Meetings</h1>
        <Link href="/record">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Recording
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mic className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No meetings yet</h2>
            <p className="text-muted-foreground mb-4">
              Record your first meeting to get started
            </p>
            <Link href="/record">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Start Recording
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {meeting.title}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={statusColors[meeting.status] || ""}
                    >
                      {meeting.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {meeting.recording_mode === "microphone" ? (
                        <Mic className="h-3.5 w-3.5" />
                      ) : (
                        <Monitor className="h-3.5 w-3.5" />
                      )}
                      {meeting.recording_mode === "microphone"
                        ? "Microphone"
                        : "System Audio"}
                    </span>
                    <span>
                      {format(new Date(meeting.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                    {meeting.duration_seconds && (
                      <span>
                        {Math.floor(meeting.duration_seconds / 60)}m{" "}
                        {meeting.duration_seconds % 60}s
                      </span>
                    )}
                    {meeting.status === "error" && (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {meeting.error_message || "Error"}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
