"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MessageSquare,
  Search,
  FolderOpen,
  ArrowRight,
  Sparkles,
  Globe,
  Headphones,
  Share2,
  Zap,
  Brain,
} from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Record Meetings",
    desc: "Capture audio from your microphone or browser tab system audio",
    gradient: "from-red-500/20 to-orange-500/20",
    iconColor: "text-red-400",
  },
  {
    icon: Globe,
    title: "97 Languages",
    desc: "Auto-detects and transcribes 97 languages — from Hindi to Danish to Japanese",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Brain,
    title: "AI Summaries",
    desc: "Get instant summaries, action items, and key decisions powered by Claude",
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-400",
  },
  {
    icon: MessageSquare,
    title: "Chat with Notes",
    desc: "Ask questions about any meeting — AI answers from the transcript",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: Search,
    title: "Smart Search",
    desc: "Semantic AI search + text search across all meetings",
    gradient: "from-yellow-500/20 to-amber-500/20",
    iconColor: "text-yellow-400",
  },
  {
    icon: Share2,
    title: "Share & Collaborate",
    desc: "Share meetings via link, invite team members, organize in workspaces",
    gradient: "from-indigo-500/20 to-violet-500/20",
    iconColor: "text-indigo-400",
  },
];

const scripts = [
  { text: "Meeting notes", lang: "English" },
  { text: "बैठक नोट्स", lang: "Hindi" },
  { text: "Mødenotater", lang: "Danish" },
  { text: "会议记录", lang: "Chinese" },
  { text: "議事録", lang: "Japanese" },
  { text: "اجتماع کی تفصیلات", lang: "Urdu" },
  { text: "சந்திப்பு குறிப்புகள்", lang: "Tamil" },
  { text: "미팅 노트", lang: "Korean" },
  { text: "Notas de reunión", lang: "Spanish" },
  { text: "Notes de réunion", lang: "French" },
  { text: "సమావేశ గమనికలు", lang: "Telugu" },
  { text: "Протокол встречи", lang: "Russian" },
];

const languages = [
  "English", "Hindi", "Danish", "Tamil", "Telugu", "Bengali", "Marathi",
  "Gujarati", "Kannada", "Malayalam", "Punjabi", "Urdu",
  "Spanish", "French", "German", "Portuguese", "Chinese",
  "Japanese", "Korean", "Arabic", "Russian", "Italian",
  "Dutch", "Turkish", "Vietnamese", "Thai", "Indonesian",
  "Swedish", "Polish", "Ukrainian", "Czech", "Norwegian",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 max-w-6xl mx-auto relative z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <Mic className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg">MeetScribe</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 text-sm">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm">
              Get Started Free
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 md:px-12 pt-16 md:pt-24 pb-20 md:pb-32 max-w-5xl mx-auto text-center">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-8 border border-emerald-500/20">
            <Sparkles className="h-3 w-3" />
            AI-powered meeting notes
          </div>

          <h1 className="text-4xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Never miss a word
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              in any language
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Record meetings, get AI transcriptions in 97 languages, instant summaries with action items, and chat with your notes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white h-13 px-8 text-base font-medium shadow-lg shadow-emerald-500/25">
                Start for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 h-13 px-8 text-base">
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Scrolling scripts bar */}
      <section className="py-8 border-y border-white/5 overflow-hidden">
        <div className="flex animate-scroll gap-8 whitespace-nowrap">
          {[...scripts, ...scripts].map((s, i) => (
            <span key={i} className="text-lg text-white/15 font-medium">
              {s.text}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 py-20 md:py-28 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need,{" "}
            <span className="text-white/40">nothing you don&apos;t</span>
          </h2>
          <p className="text-white/40 max-w-lg mx-auto">
            From recording to action items — MeetScribe handles it all so you can focus on the conversation.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all hover:-translate-y-1 duration-300"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4`}>
                <f.icon className={`h-5 w-5 ${f.iconColor}`} />
              </div>
              <h3 className="font-semibold text-white/90 mb-2">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Languages section with globe graphic */}
      <section className="px-6 md:px-12 py-20 max-w-5xl mx-auto">
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-10 md:p-16 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium mb-4 border border-blue-500/20">
              <Globe className="h-3 w-3" />
              Multilingual
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Speaks your language
            </h2>
            <p className="text-white/40 max-w-md mx-auto text-sm">
              Auto-detects and transcribes meetings in 97 languages. No configuration needed.
            </p>
          </div>

          {/* Script samples in a grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
            {scripts.map((s, i) => (
              <div
                key={i}
                className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
              >
                <p className="text-sm text-white/70 mb-1 truncate">{s.text}</p>
                <p className="text-[10px] text-white/25">{s.lang}</p>
              </div>
            ))}
          </div>

          {/* Language pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {languages.map((lang) => (
              <span
                key={lang}
                className="px-3 py-1 rounded-full text-xs text-white/40 bg-white/[0.04] border border-white/[0.06] hover:text-white/60 hover:border-white/[0.12] transition-colors"
              >
                {lang}
              </span>
            ))}
            <span className="px-3 py-1 rounded-full text-xs text-emerald-400/60 bg-emerald-500/5 border border-emerald-500/10">
              +66 more
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 md:px-12 py-20 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Three steps.{" "}
            <span className="text-white/40">Zero effort.</span>
          </h2>
        </div>
        <div className="flex flex-col md:flex-row gap-6">
          {[
            {
              step: "1",
              title: "Record",
              desc: "Hit record during any meeting — in person or online. Works with mic or browser audio.",
              icon: Headphones,
              color: "from-red-500 to-orange-500",
            },
            {
              step: "2",
              title: "AI processes",
              desc: "OpenAI Whisper transcribes in any language. Claude generates summaries, action items, and tags.",
              icon: Zap,
              color: "from-purple-500 to-pink-500",
            },
            {
              step: "3",
              title: "Review & act",
              desc: "Read notes, chat with them, search across meetings, share with your team, and export.",
              icon: FolderOpen,
              color: "from-emerald-500 to-cyan-500",
            },
          ].map((s) => (
            <div key={s.step} className="flex-1 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                <s.icon className="h-6 w-6 text-white" />
              </div>
              <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">Step {s.step}</div>
              <h3 className="font-bold text-white/90 mb-2 text-lg">{s.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-24 max-w-4xl mx-auto text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-purple-500/5 rounded-3xl pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Stop losing
            <br />
            meeting insights
          </h2>
          <p className="text-white/40 mb-8 text-lg">
            Join teams who never miss an action item.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white h-13 px-10 text-base font-medium shadow-lg shadow-emerald-500/25">
              Get started free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-white/20 mt-4">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 border-t border-white/5 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/30">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Mic className="h-3 w-3 text-white" />
            </div>
            MeetScribe
          </div>
          <p>Built with Next.js, Supabase, OpenAI Whisper, and Claude</p>
        </div>
      </footer>

      {/* Scrolling animation CSS */}
      <style jsx>{`
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
