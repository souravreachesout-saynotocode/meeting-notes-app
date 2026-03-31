"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Brain,
  MessageSquare,
  Search,
  FolderOpen,
  ArrowRight,
  Sparkles,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Record Meetings",
    desc: "Capture audio from your microphone or browser tab system audio",
  },
  {
    icon: Globe,
    title: "Hindi + English",
    desc: "Auto-detects and transcribes both Hindi and English seamlessly",
  },
  {
    icon: Brain,
    title: "AI Summaries",
    desc: "Get instant summaries, action items, and key decisions from Claude",
  },
  {
    icon: MessageSquare,
    title: "Chat with Notes",
    desc: "Ask questions about any meeting — AI answers from the transcript",
  },
  {
    icon: Search,
    title: "Search Everything",
    desc: "Full-text search across all your transcripts and summaries",
  },
  {
    icon: FolderOpen,
    title: "Organize in Folders",
    desc: "Group meetings into spaces and folders for easy access",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#111] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-400" />
          <span className="font-bold text-lg">MeetScribe</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 text-sm">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-white text-black hover:bg-white/90 text-sm">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-20 pb-24 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-8 border border-emerald-500/20">
          <Sparkles className="h-3 w-3" />
          Powered by AI
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
          Your meetings,
          <br />
          <span className="text-white/40">automatically captured.</span>
        </h1>
        <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          Record, transcribe, and summarize your meetings with AI.
          Get action items, search across meetings, and chat with your notes —
          all in one place.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="bg-white text-black hover:bg-white/90 h-12 px-8 text-sm font-medium">
              Start for free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 h-12 px-8 text-sm">
              Log in
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 py-20 max-w-5xl mx-auto">
        <h2 className="text-sm font-medium text-white/30 uppercase tracking-wider text-center mb-12">
          Everything you need
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
            >
              <f.icon className="h-5 w-5 text-white/40 mb-4" />
              <h3 className="font-semibold text-white/90 mb-2">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 md:px-12 py-20 max-w-4xl mx-auto">
        <h2 className="text-sm font-medium text-white/30 uppercase tracking-wider text-center mb-12">
          How it works
        </h2>
        <div className="flex flex-col md:flex-row gap-8">
          {[
            { step: "1", title: "Record", desc: "Hit record during any meeting — in person or online" },
            { step: "2", title: "AI processes", desc: "Whisper transcribes, Claude summarizes with action items" },
            { step: "3", title: "Review & act", desc: "Read notes, chat with them, search, and export" },
          ].map((s) => (
            <div key={s.step} className="flex-1 text-center">
              <div className="w-10 h-10 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-sm font-bold mx-auto mb-4">
                {s.step}
              </div>
              <h3 className="font-semibold text-white/90 mb-2">{s.title}</h3>
              <p className="text-sm text-white/40">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-20 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Stop losing meeting insights
        </h2>
        <p className="text-white/40 mb-8">
          Start capturing every detail — automatically.
        </p>
        <Link href="/signup">
          <Button size="lg" className="bg-white text-black hover:bg-white/90 h-12 px-8">
            Get started free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 border-t border-white/5 max-w-6xl mx-auto">
        <div className="flex items-center justify-between text-xs text-white/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            MeetScribe
          </div>
          <p>Built with Next.js, Supabase, OpenAI, and Claude</p>
        </div>
      </footer>
    </div>
  );
}
