"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Meeting, Folder } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Mic,
  FileText,
  BookOpen,
  Lock,
  Plus,
  Loader2,
  AlertCircle,
  ListTodo,
  GripVertical,
  X,
  CheckCircle2,
  Circle,
  Calendar,
  Video,
} from "lucide-react";

const statusIndicator: Record<string, string> = {
  recording: "bg-red-500",
  transcribing: "bg-yellow-500",
  summarizing: "bg-blue-500",
  completed: "bg-emerald-500",
  error: "bg-red-500",
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

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

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  meetLink: string | null;
}

interface ActionItem {
  text: string;
  assignee?: string;
  completed?: boolean;
  meetingTitle?: string;
  meetingId?: string;
}

export default function DashboardPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTodos, setShowTodos] = useState(false);
  const [showDigest, setShowDigest] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [recentTodos, setRecentTodos] = useState<ActionItem[]>([]);
  const [todosLoading, setTodosLoading] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [dragMeetingId, setDragMeetingId] = useState<string | null>(null);
  const [showFolderDrop, setShowFolderDrop] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [meetingsRes, foldersRes] = await Promise.all([
        supabase.from("meetings").select("*").order("created_at", { ascending: false }),
        supabase.from("folders").select("*").order("created_at", { ascending: true }),
      ]);
      setMeetings(meetingsRes.data || []);
      setFolders(foldersRes.data || []);
      setLoading(false);

      // Fetch calendar events
      try {
        const calRes = await fetch("/api/calendar/events");
        if (calRes.ok) {
          const events = await calRes.json();
          setCalendarEvents(events);
        } else {
          const err = await calRes.json();
          if (calRes.status !== 401) {
            setCalendarError(err.error);
          }
        }
      } catch {
        // Calendar is optional, don't block dashboard
      }
    }
    fetchData();
  }, []);

  const fetchRecentTodos = async () => {
    setTodosLoading(true);
    const supabase = createClient();

    // Get summaries from recent completed meetings
    const { data: summaries } = await supabase
      .from("summaries")
      .select("meeting_id, action_items")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!summaries) {
      setTodosLoading(false);
      return;
    }

    const meetingIds = summaries.map((s) => s.meeting_id);
    const { data: meetingData } = await supabase
      .from("meetings")
      .select("id, title")
      .in("id", meetingIds);

    const titleMap = new Map((meetingData || []).map((m) => [m.id, m.title]));

    const todos: ActionItem[] = [];
    for (const s of summaries) {
      const items = (s.action_items || []) as ActionItem[];
      for (const item of items) {
        todos.push({
          ...item,
          meetingTitle: titleMap.get(s.meeting_id) || "Meeting",
          meetingId: s.meeting_id,
        });
      }
    }

    setRecentTodos(todos);
    setTodosLoading(false);
    setShowTodos(true);
  };

  const fetchDigest = async () => {
    setDigestLoading(true);
    try {
      // Try GET first (existing digest)
      let res = await fetch("/api/digest");
      let data = await res.json();

      if (data.digest) {
        setDigest(data.digest);
      } else {
        // Generate new one
        res = await fetch("/api/digest", { method: "POST" });
        data = await res.json();
        setDigest(data.digest || data.error || "Could not generate digest.");
      }
    } catch {
      setDigest("Failed to generate weekly digest.");
    }
    setDigestLoading(false);
    setShowDigest(true);
  };

  const handleDragStart = (meetingId: string) => {
    setDragMeetingId(meetingId);
    setShowFolderDrop(true);
  };

  const handleDragEnd = () => {
    setDragMeetingId(null);
    setShowFolderDrop(false);
  };

  const handleDropOnFolder = async (folderId: string) => {
    if (!dragMeetingId) return;
    const supabase = createClient();
    await supabase
      .from("meetings")
      .update({ folder_id: folderId })
      .eq("id", dragMeetingId);

    setMeetings((prev) =>
      prev.map((m) =>
        m.id === dragMeetingId ? { ...m, folder_id: folderId } : m
      )
    );
    setDragMeetingId(null);
    setShowFolderDrop(false);
  };

  const todayMeetings = meetings.filter((m) => isToday(parseISO(m.created_at)));
  const upcomingGroups = groupMeetingsByDate(meetings);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-4 md:p-10 max-w-4xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div />
          <div className="flex items-center gap-3">
            <Link href="/record">
              <Button size="sm" className="bg-white text-black hover:bg-white/90 text-sm font-medium">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Quick note</span>
                <span className="sm:hidden">New</span>
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-6 w-32 bg-white/5" />
            <Skeleton className="h-48 w-full rounded-xl bg-white/5" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 md:py-24 text-center px-4">
            <Mic className="h-12 md:h-16 w-12 md:w-16 text-white/20 mb-4 md:mb-6" />
            <h2 className="text-lg md:text-xl font-semibold text-white mb-2">
              No meetings yet
            </h2>
            <p className="text-white/50 mb-6 max-w-sm text-sm md:text-base">
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
            {/* Coming up - Calendar events */}
            {calendarEvents.length > 0 && (
              <div className="mb-8 md:mb-10">
                <h2 className="text-lg font-semibold text-white/90 mb-4">Coming up</h2>
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  {(() => {
                    const eventsByDate = new Map<string, CalendarEvent[]>();
                    for (const ev of calendarEvents) {
                      const dateKey = format(parseISO(ev.start), "yyyy-MM-dd");
                      if (!eventsByDate.has(dateKey)) eventsByDate.set(dateKey, []);
                      eventsByDate.get(dateKey)!.push(ev);
                    }

                    return Array.from(eventsByDate.entries()).map(([dateKey, events], gi) => {
                      const date = parseISO(dateKey);
                      return (
                        <div key={dateKey}>
                          <div className={cn("flex", gi > 0 && "border-t border-dashed border-white/10")}>
                            <div className="w-16 md:w-24 shrink-0 py-3 md:py-4 px-2 md:px-4 flex flex-col items-center justify-start">
                              <span className="text-xl md:text-2xl font-light text-white/90">{format(date, "d")}</span>
                              <span className="text-[10px] md:text-[11px] text-white/40 uppercase font-medium">{format(date, "MMM")}</span>
                              <span className="text-[10px] md:text-[11px] text-white/30">{format(date, "EEE")}</span>
                              {isToday(date) && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1" />}
                            </div>
                            <div className="flex-1 py-1 md:py-2 border-l border-white/10">
                              {events.map((event) => (
                                <div key={event.id} className="flex items-center gap-3 px-3 md:px-4 py-2.5 hover:bg-white/5 transition-colors">
                                  <div className="w-0.5 h-8 rounded-full bg-blue-500 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white/90 truncate">{event.title}</p>
                                    <p className="text-xs text-white/40">
                                      {format(parseISO(event.start), "HH:mm")} – {format(parseISO(event.end), "HH:mm")}
                                    </p>
                                  </div>
                                  {event.meetLink && (
                                    <a
                                      href={event.meetLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 shrink-0"
                                    >
                                      <Video className="h-3.5 w-3.5" />
                                      <span className="hidden md:inline">Join</span>
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {calendarError && (
              <div className="mb-6 flex items-center gap-2 text-xs text-white/30 px-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{calendarError}</span>
              </div>
            )}

            {/* Day-wise calendar view */}
            {upcomingGroups.length > 0 && (
              <div className="mb-8 md:mb-10">
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  {upcomingGroups.map((group, gi) => (
                    <div key={group.label}>
                      <div
                        className={cn(
                          "flex",
                          gi > 0 && "border-t border-dashed border-white/10"
                        )}
                      >
                        {/* Date column */}
                        <div className="w-16 md:w-24 shrink-0 py-3 md:py-4 px-2 md:px-4 flex flex-col items-center justify-start">
                          <span className="text-xl md:text-2xl font-light text-white/90">
                            {group.dayNum}
                          </span>
                          <span className="text-[10px] md:text-[11px] text-white/40 uppercase">
                            {group.month.slice(0, 3)}
                          </span>
                          <span className="text-[10px] md:text-[11px] text-white/30">
                            {group.dayName}
                          </span>
                        </div>

                        {/* Meetings column */}
                        <div className="flex-1 py-1 md:py-2 border-l border-white/10">
                          {group.meetings.map((meeting) => (
                            <div
                              key={meeting.id}
                              className="flex items-center group"
                              draggable
                              onDragStart={() => handleDragStart(meeting.id)}
                              onDragEnd={handleDragEnd}
                            >
                              <div className="hidden md:flex w-6 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                                <GripVertical className="h-3.5 w-3.5 text-white/20" />
                              </div>
                              <Link
                                href={`/meetings/${meeting.id}`}
                                className="flex-1 flex items-center gap-3 px-3 md:px-4 py-2.5 hover:bg-white/5 transition-colors min-w-0"
                              >
                                <div
                                  className={`w-0.5 h-8 rounded-full shrink-0 ${statusIndicator[meeting.status] || "bg-white/20"}`}
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
                                {(meeting.status === "transcribing" || meeting.status === "summarizing") && (
                                  <Loader2 className="h-3.5 w-3.5 text-white/30 animate-spin shrink-0" />
                                )}
                                {meeting.status === "error" && (
                                  <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                                )}
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today section */}
            {todayMeetings.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-medium text-white/40 mb-4">Today</h2>
                <div className="space-y-1">
                  {todayMeetings.map((meeting) => (
                    <Link
                      key={`today-${meeting.id}`}
                      href={`/meetings/${meeting.id}`}
                      className="flex items-center gap-3 md:gap-4 py-3 px-2 hover:bg-white/5 rounded-lg transition-colors"
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

            {/* Recent Todos Panel */}
            {showTodos && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-white/40">Recent Action Items</h2>
                  <button onClick={() => setShowTodos(false)} className="text-white/30 hover:text-white/60">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {todosLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full bg-white/5 rounded-lg" />
                    <Skeleton className="h-10 w-full bg-white/5 rounded-lg" />
                  </div>
                ) : recentTodos.length === 0 ? (
                  <p className="text-sm text-white/30 py-4">No action items found in recent meetings.</p>
                ) : (
                  <div className="space-y-1 rounded-xl border border-white/10 p-3">
                    {recentTodos.map((todo, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-white/5">
                        {todo.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-white/20 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80">{todo.text}</p>
                          <Link
                            href={`/meetings/${todo.meetingId}`}
                            className="text-xs text-white/30 hover:text-white/50"
                          >
                            {todo.meetingTitle}
                            {todo.assignee && ` · ${todo.assignee}`}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Weekly Digest Panel */}
      {showDigest && (
        <div className="px-4 md:px-10 pb-4 max-w-4xl w-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white/40 flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" />
              Weekly Digest
            </h2>
            <button onClick={() => setShowDigest(false)} className="text-white/30 hover:text-white/60">
              <X className="h-4 w-4" />
            </button>
          </div>
          {digestLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-white/5" />
              <Skeleton className="h-4 w-3/4 bg-white/5" />
              <Skeleton className="h-4 w-5/6 bg-white/5" />
            </div>
          ) : (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
                {digest}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drag-to-folder overlay */}
      {showFolderDrop && folders.length > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#252525] border border-white/10 rounded-xl p-3 shadow-2xl flex gap-2">
          {folders.map((folder) => (
            <div
              key={folder.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropOnFolder(folder.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span>{folder.icon}</span>
              <span className="text-sm text-white/60">{folder.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom bar — Granola style */}
      {meetings.length > 0 && (
        <div className="sticky bottom-0 border-t border-white/5 bg-[#1e1e1e] px-4 md:px-10 py-3">
          <div className="max-w-4xl flex items-center justify-between">
            <p className="text-xs text-white/20 hidden md:block">
              Drag & drop note to organize
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => (showTodos ? setShowTodos(false) : fetchRecentTodos())}
                className={cn(
                  "text-sm font-medium rounded-full px-4",
                  showTodos
                    ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                    : "bg-white/10 text-white/60 hover:bg-white/15 border border-white/10"
                )}
              >
                <ListTodo className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">{showTodos ? "Hide todos" : "Recent todos"}</span>
              </Button>
              <Button
                size="sm"
                onClick={() => (showDigest ? setShowDigest(false) : fetchDigest())}
                className={cn(
                  "text-sm font-medium rounded-full px-4",
                  showDigest
                    ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30"
                    : "bg-white/10 text-white/60 hover:bg-white/15 border border-white/10"
                )}
              >
                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">{showDigest ? "Hide digest" : "Weekly digest"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
