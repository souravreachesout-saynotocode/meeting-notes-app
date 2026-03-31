"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send, Loader2, Check, ThumbsUp, ThumbsDown, Minus } from "lucide-react";

const ratings = [
  { value: "positive", icon: ThumbsUp, label: "Love it", color: "text-emerald-400" },
  { value: "neutral", icon: Minus, label: "It's okay", color: "text-yellow-400" },
  { value: "negative", icon: ThumbsDown, label: "Needs work", color: "text-red-400" },
];

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() && !rating) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("feedback").insert({
      user_id: user?.id,
      email: user?.email,
      message: message.trim(),
      rating,
      page: typeof window !== "undefined" ? window.location.pathname : null,
    });

    setLoading(false);
    setSent(true);
    setTimeout(() => {
      setOpen(false);
      setSent(false);
      setMessage("");
      setRating(null);
    }, 2000);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-11 w-11 rounded-full bg-white text-black shadow-lg hover:bg-white/90 flex items-center justify-center transition-transform hover:scale-105"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* Feedback panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-80 bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <span className="text-sm font-medium text-white">Send Feedback</span>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/60">
              <X className="h-4 w-4" />
            </button>
          </div>

          {sent ? (
            <div className="p-6 text-center">
              <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-white/70">Thanks for your feedback!</p>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {/* Rating */}
              <div className="flex gap-2 justify-center">
                {ratings.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRating(rating === r.value ? null : r.value)}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                      rating === r.value
                        ? "bg-white/10 " + r.color
                        : "text-white/30 hover:text-white/50 hover:bg-white/5"
                    }`}
                  >
                    <r.icon className="h-5 w-5" />
                    <span className="text-[10px]">{r.label}</span>
                  </button>
                ))}
              </div>

              {/* Message */}
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind? Bug reports, feature requests, or just say hi..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 text-sm min-h-[80px] resize-none"
              />

              <Button
                onClick={handleSubmit}
                disabled={loading || (!message.trim() && !rating)}
                className="w-full bg-white text-black hover:bg-white/90 text-sm h-9"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Send
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
