"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@/hooks/use-chat";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Loader2, User, Bot } from "lucide-react";

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { messages, isLoading, error, sendMessage } = useChat(id);
  const [input, setInput] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("Meeting");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchTitle() {
      const supabase = createClient();
      const { data } = await supabase
        .from("meetings")
        .select("title")
        .eq("id", id)
        .single();
      if (data) setMeetingTitle(data.title);
    }
    fetchTitle();
  }, [id]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    await sendMessage(trimmed);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <Link href={`/meetings/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-semibold text-sm">Chat with transcript</h1>
          <p className="text-xs text-muted-foreground">{meetingTitle}</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              Ask questions about this meeting&apos;s transcript.
            </p>
            <p className="text-xs mt-1">
              e.g. &ldquo;What were the main decisions?&rdquo; or &ldquo;Summarize in Hindi&rdquo;
            </p>
          </div>
        )}

        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <Card
                className={`max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : ""
                }`}
              >
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </CardContent>
              </Card>
              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <Card>
                <CardContent className="p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {error && (
          <p className="text-destructive text-sm text-center mt-4">{error}</p>
        )}
      </ScrollArea>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t p-4 flex gap-2 max-w-2xl mx-auto w-full"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this meeting..."
          disabled={isLoading}
          autoFocus
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
