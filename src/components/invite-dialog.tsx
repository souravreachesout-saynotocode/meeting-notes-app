"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  UserPlus,
  Link2,
  Check,
  Loader2,
} from "lucide-react";

export function InviteDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const handleAddEmail = () => {
    const trimmed = email.trim();
    if (trimmed && trimmed.includes("@") && !emails.includes(trimmed)) {
      setEmails((prev) => [...prev, trimmed]);
      setEmail("");
    }
  };

  const handleRemoveEmail = (e: string) => {
    setEmails((prev) => prev.filter((x) => x !== e));
  };

  const handleInvite = async () => {
    if (emails.length === 0) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get or create default workspace
    let workspaceId: string | null = null;
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id")
      .limit(1);

    if (workspaces && workspaces.length > 0) {
      workspaceId = workspaces[0].id;
    } else if (user) {
      const { data: newWs } = await supabase
        .from("workspaces")
        .insert({ name: "My Workspace", owner_id: user.id })
        .select("id")
        .single();
      if (newWs) {
        workspaceId = newWs.id;
        await supabase.from("workspace_members").insert({
          workspace_id: newWs.id,
          user_id: user.id,
          role: "owner",
        });
      }
    }

    if (workspaceId) {
      for (const inviteEmail of emails) {
        await fetch(`/api/workspaces/${workspaceId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail }),
        });
      }
    }

    setLoading(false);
    setSent(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.origin + "/signup");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#252525] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end p-3">
          <button onClick={onClose} className="text-white/30 hover:text-white/60">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-8 pb-8 text-center">
          {/* Avatar icons */}
          <div className="flex items-center justify-center mb-6">
            <div className="h-14 w-14 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xl font-bold -mr-2 z-10 border-2 border-[#252525]">
              M
            </div>
            <div className="h-14 w-14 rounded-full bg-blue-500 flex items-center justify-center text-white -ml-2 border-2 border-[#252525]">
              <UserPlus className="h-6 w-6" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            Invite teammates
            <br />
            to your workspace
          </h2>
          <p className="text-sm text-white/40 mb-6 max-w-xs mx-auto">
            Share meeting notes instantly, collaborate in team folders, and grow team knowledge together.
          </p>

          {sent ? (
            <div className="py-6">
              <Check className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-white/70">Invitations sent!</p>
            </div>
          ) : (
            <>
              {/* Email input */}
              <div className="mb-4">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Add emails or people"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                />
              </div>

              {/* Email chips */}
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {emails.map((e) => (
                    <span
                      key={e}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs"
                    >
                      + {e}
                      <button onClick={() => handleRemoveEmail(e)} className="text-white/30 hover:text-white/60">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Invite button */}
              <Button
                onClick={handleInvite}
                disabled={loading || emails.length === 0}
                className="w-full bg-white text-black hover:bg-white/90 h-11 font-medium mb-4"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
              </Button>

              {/* Copy link */}
              <button
                onClick={copyInviteLink}
                className="flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/60 mx-auto"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Link2 className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy invite link"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
