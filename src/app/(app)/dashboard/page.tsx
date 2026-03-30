"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Meeting } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Mic,
  FileText,
  Lock,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";

const statusIndicator: Record<string, string> = {
  recording: "bg-red-500",
  transcribing: "bg-yellow-500",
  summarizing: "bg-blue-500",
  completed: "bg-emerald-500",
  error: "bg-red-500",
};

function groupMeetingsByDate(meetings: Meeting[]) {
  const groups: { label: string; date: Date; dayNum: string; dayName: string; month: string; meetings: Meeting[] }[] = [];
  const map = new Map<string, Meeting[]>();

  for (const m of meetings) {
    const dateKey = format(parseISO(m.created_at), "yyyy-MM-dd");
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey)!.push(m);
  }

  for (const [dateKey, items] of map) {
    const date = parseISO(dateKey);
    let label: string;
    if (isToday(date)) label = "Today";
    else if (isYesterday(date)) label = "Yesterday";
    else label = format(date, "MMMM d, yyyy");

    groups.push({
      label,
      date,
      dayNum: format(date, "d"),
      dayName: format(date, "EEE"),
      month: format(date, "MMMM"),
      meetings: items.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    });
  }

  return groups;
}

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

  const todayMeetings = meetings.filter((m) => isToday(parseISO(m.created_at)));
  const upcomingGroups = groupMeetingsByDate(meetings);

  return (
    <div className="flex-1 p-6 md:p-10 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div />
        <div className="flex items-center gap-3">
          <Link href="/record">
            <Button size="sm" className="bg-white text-black hover:bg-white/90 text-sm font-medium">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Quick note
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-6 w-32 bg-white/5" />
          <Skeleton className="h-48 w-full rounded-xl bg-white/5" />
          <Skeleton className="h-6 w-24 bg-white/5" />
          <Skeleton className="h-32 w-full rounded-xl bg-white/5" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Mic className="h-16 w-16 text-white/20 mb-6" />
          <h2 className="text-xl font-semibold text-white mb-2">
            No meetings yet
          </h2>
          <p className="text-white/50 mb-6 max-w-sm">
            Record your first meeting to get started with AI transcription and summarization
          </p>
          <Link href="/record">
            <Button className="bg-white text-black hover:bg-white/90">
              <Mic className="mr-2 h-4 w-4" />
              Start Recording
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Day-wise calendar view */}
          {upcomingGroups.length > 0 && (
            <div className="mb-10">
              <div className="rounded-xl border border-white/10 overflow-hidden">
                {upcomingGroups.map((group, gi) => (
                  <div key={group.label}>
                    {/* Day row */}
                    <div
                      className={cn(
                        "flex",
                        gi > 0 && "border-t border-dashed border-white/10"
                      )}
                    >
                      {/* Date column */}
                      <div className="w-24 shrink-0 py-4 px-4 flex flex-col items-center justify-start">
                        <span className="text-2xl font-light text-white/90">
                          {group.dayNum}
                        </span>
                        <span className="text-[11px] text-white/40 uppercase">
                          {group.month}
                        </span>
                        <span className="text-[11px] text-white/30">
                          {group.dayName}
                        </span>
                      </div>

                      {/* Meetings column */}
                      <div className="flex-1 py-2 border-l border-white/10">
                        {group.meetings.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-white/30">
                            No meetings
                          </div>
                        ) : (
                          group.meetings.map((meeting) => (
                            <Link
                              key={meeting.id}
                              href={`/meetings/${meeting.id}`}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors group"
                            >
                              <div
                                className={`w-0.5 h-8 rounded-full ${statusIndicator[meeting.status] || "bg-white/20"}`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white/90 truncate">
                                  {meeting.title}
                                </p>
                                <p className="text-xs text-white/40">
                                  {format(parseISO(meeting.created_at), "HH:mm")}
                                  {meeting.duration_seconds &&
                                    ` – ${format(
                                      new Date(
                                        parseISO(meeting.created_at).getTime() +
                                          meeting.duration_seconds * 1000
                                      ),
                                      "HH:mm"
                                    )}`}
                                </p>
                              </div>
                              {meeting.status === "transcribing" || meeting.status === "summarizing" ? (
                                <Loader2 className="h-3.5 w-3.5 text-white/30 animate-spin" />
                              ) : meeting.status === "error" ? (
                                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                              ) : null}
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today section - note-style cards */}
          {todayMeetings.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-white/40 mb-4">Today</h2>
              <div className="space-y-2">
                {todayMeetings.map((meeting) => (
                  <Link
                    key={`today-${meeting.id}`}
                    href={`/meetings/${meeting.id}`}
                    className="flex items-center gap-4 py-3 px-2 hover:bg-white/5 rounded-lg transition-colors group"
                  >
                    <FileText className="h-5 w-5 text-white/20 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/90 truncate">
                        {meeting.title}
                      </p>
                      <p className="text-xs text-white/40">Me</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Lock className="h-3 w-3 text-white/20" />
                      <span className="text-xs text-white/40">
                        {format(parseISO(meeting.created_at), "HH:mm")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
