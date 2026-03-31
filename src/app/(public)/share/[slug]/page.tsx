"use client";

import { useEffect, useState, use } from "react";
import { format } from "date-fns";
import { Sparkles, CheckCircle2, Circle, Lock } from "lucide-react";

interface SharedMeeting {
  title: string;
  created_at: string;
  duration_seconds: number | null;
  summary: string | null;
  action_items: { text: string; assignee?: string; completed?: boolean }[];
  key_decisions: { text: string }[];
  tags: string[];
}

export default function PublicSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [meeting, setMeeting] = useState<SharedMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShared() {
      try {
        const res = await fetch(`/api/public/${slug}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Meeting not found");
        } else {
          setMeeting(await res.json());
        }
      } catch {
        setError("Failed to load meeting");
      }
      setLoading(false);
    }
    fetchShared();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center text-center px-4">
        <Lock className="h-12 w-12 text-white/20 mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">
          {error || "Meeting not found"}
        </h1>
        <p className="text-white/40 text-sm">
          This link may have expired or been disabled.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] text-white">
      {/* Header */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span className="font-bold text-sm">MeetScribe</span>
        </div>
        <span className="text-xs text-white/30">Shared meeting notes</span>
      </nav>

      <main className="max-w-4xl mx-auto px-6 md:px-12 py-10">
        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2">{meeting.title}</h1>
        <p className="text-sm text-white/40 mb-4">
          {format(new Date(meeting.created_at), "MMMM d, yyyy 'at' h:mm a")}
          {meeting.duration_seconds &&
            ` · ${Math.floor(meeting.duration_seconds / 60)}m ${meeting.duration_seconds % 60}s`}
        </p>

        {/* Tags */}
        {meeting.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-8">
            {meeting.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-white/60"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Summary */}
        {meeting.summary && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
              Summary
            </h2>
            <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="whitespace-pre-wrap text-white/80 text-sm leading-relaxed">
                {meeting.summary}
              </div>
            </div>
          </section>
        )}

        {/* Action Items */}
        {meeting.action_items.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
              Action Items
            </h2>
            <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10">
              <ul className="space-y-3">
                {meeting.action_items.map((item, i) => (
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
            </div>
          </section>
        )}

        {/* Key Decisions */}
        {meeting.key_decisions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
              Key Decisions
            </h2>
            <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10">
              <ul className="space-y-2">
                {meeting.key_decisions.map((d, i) => (
                  <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                    <span className="text-white/30 mt-0.5">•</span>
                    {d.text}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="text-center py-8 border-t border-white/5 mt-10">
          <p className="text-xs text-white/20">
            Shared via MeetScribe — AI meeting notes
          </p>
        </div>
      </main>
    </div>
  );
}
