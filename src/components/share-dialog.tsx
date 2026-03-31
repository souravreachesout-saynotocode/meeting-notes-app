"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Share2,
  Link2,
  Copy,
  Check,
  Trash2,
  Globe,
  Mail,
  Loader2,
} from "lucide-react";

interface Share {
  id: string;
  email: string;
  permission: string;
  created_at: string;
}

interface PublicLink {
  slug?: string;
  is_active?: boolean;
  view_count?: number;
  exists?: boolean;
}

export function ShareDialog({
  meetingId,
  onClose,
}: {
  meetingId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [shares, setShares] = useState<Share[]>([]);
  const [publicLink, setPublicLink] = useState<PublicLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch existing shares and public link
    Promise.all([
      fetch(`/api/meetings/${meetingId}/share`).then((r) => r.json()),
      fetch(`/api/meetings/${meetingId}/public-link`).then((r) => r.json()),
    ]).then(([sharesData, linkData]) => {
      setShares(Array.isArray(sharesData) ? sharesData : []);
      setPublicLink(linkData.slug ? linkData : null);
    });
  }, [meetingId]);

  const handleShare = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/meetings/${meetingId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setShares((prev) => [data, ...prev]);
      setEmail("");
    }
    setLoading(false);
  };

  const handleRemoveShare = async (shareId: string) => {
    await fetch(`/api/meetings/${meetingId}/share`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ share_id: shareId }),
    });
    setShares((prev) => prev.filter((s) => s.id !== shareId));
  };

  const handleCreatePublicLink = async () => {
    const res = await fetch(`/api/meetings/${meetingId}/public-link`, {
      method: "POST",
    });
    const data = await res.json();
    setPublicLink(data);
  };

  const handleDisablePublicLink = async () => {
    await fetch(`/api/meetings/${meetingId}/public-link`, {
      method: "DELETE",
    });
    setPublicLink(null);
  };

  const copyLink = () => {
    if (!publicLink?.slug) return;
    navigator.clipboard.writeText(`${window.location.origin}/share/${publicLink.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#252525] border border-white/10 rounded-xl w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-white/50" />
            <h2 className="font-semibold text-white text-sm">Share Meeting</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Invite by email */}
          <div>
            <label className="text-xs text-white/40 mb-2 block">Invite people</label>
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                type="email"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleShare()}
              />
              <Button
                onClick={handleShare}
                disabled={loading || !email.trim()}
                size="sm"
                className="bg-white text-black hover:bg-white/90 shrink-0"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>

          {/* Shared with */}
          {shares.length > 0 && (
            <div>
              <label className="text-xs text-white/40 mb-2 block">Shared with</label>
              <div className="space-y-1">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-white/30" />
                      <span className="text-sm text-white/70">{share.email}</span>
                      <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                        {share.permission}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveShare(share.id)}
                      className="text-white/20 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Public link */}
          <div className="border-t border-white/10 pt-4">
            <label className="text-xs text-white/40 mb-2 block flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Public link
            </label>
            {publicLink?.slug ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/50 truncate">
                    {window.location.origin}/share/{publicLink.slug}
                  </div>
                  <Button size="sm" variant="ghost" onClick={copyLink} className="text-white/40 hover:text-white shrink-0">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/30">
                    {publicLink.view_count || 0} views
                  </span>
                  <button
                    onClick={handleDisablePublicLink}
                    className="text-xs text-red-400/60 hover:text-red-400"
                  >
                    Disable link
                  </button>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleCreatePublicLink}
                size="sm"
                className="bg-white/10 hover:bg-white/15 text-white border-0 text-xs w-full"
              >
                <Link2 className="mr-2 h-3.5 w-3.5" />
                Create public link
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
