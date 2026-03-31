"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText } from "lucide-react";

interface SharedMeeting {
  id: string;
  meeting_id: string;
  email: string;
  permission: string;
  shared_by: string;
  created_at: string;
  meeting?: {
    id: string;
    title: string;
    created_at: string;
    status: string;
  };
}

export default function SharedWithMePage() {
  const [shares, setShares] = useState<SharedMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShared() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email) {
        setLoading(false);
        return;
      }

      // Get meetings shared with this user's email
      const { data: shareData } = await supabase
        .from("meeting_shares")
        .select("*")
        .or(`email.eq.${user.email},shared_with.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!shareData || shareData.length === 0) {
        setLoading(false);
        return;
      }

      // Get meeting details
      const meetingIds = shareData.map((s) => s.meeting_id);
      const { data: meetings } = await supabase
        .from("meetings")
        .select("id, title, created_at, status")
        .in("id", meetingIds);

      const meetingMap = new Map((meetings || []).map((m) => [m.id, m]));

      setShares(
        shareData.map((s) => ({
          ...s,
          meeting: meetingMap.get(s.meeting_id),
        }))
      );
      setLoading(false);
    }
    fetchShared();
  }, []);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-6">Shared with me</h1>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl bg-white/5" />
          ))}
        </div>
      ) : shares.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">No meetings have been shared with you yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shares.map((share) => (
            <Link
              key={share.id}
              href={`/meetings/${share.meeting_id}`}
              className="flex items-center gap-4 py-3 px-4 hover:bg-white/5 rounded-xl transition-colors"
            >
              <FileText className="h-5 w-5 text-white/20 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">
                  {share.meeting?.title || "Meeting"}
                </p>
                <p className="text-xs text-white/40">
                  {share.meeting?.created_at &&
                    format(new Date(share.meeting.created_at), "MMM d, yyyy")}
                  {" · "}
                  {share.permission} access
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
