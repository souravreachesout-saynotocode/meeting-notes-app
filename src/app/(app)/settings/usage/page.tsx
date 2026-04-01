"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Zap,
  Calendar,
  Mic,
  Brain,
  MessageSquare,
  Search,
} from "lucide-react";

const SERVICE_META: Record<string, { label: string; icon: typeof Mic; color: string }> = {
  "whisper-transcription": { label: "Whisper (Transcription)", icon: Mic, color: "#ef4444" },
  "claude-summarize": { label: "Claude (Summarization)", icon: Brain, color: "#a855f7" },
  "claude-chat": { label: "Claude (Chat)", icon: MessageSquare, color: "#3b82f6" },
  "claude-digest": { label: "Claude (Weekly Digest)", icon: Calendar, color: "#f59e0b" },
  "openai-embedding": { label: "OpenAI (Embeddings)", icon: Search, color: "#10b981" },
};

interface UsageData {
  daily: { date: string; cost: number; calls: number }[];
  byService: Record<string, { calls: number; cost: number }>;
  totalCost: string;
  totalCalls: number;
  projectedMonthly: string;
  avgDailyCost: string;
  todayCost: string;
  todayCalls: number;
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/usage/detailed")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const maxDailyCost = data
    ? Math.max(...data.daily.map((d) => d.cost), 1)
    : 1;

  return (
    <div className="flex-1 p-6 md:p-10 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Usage & Costs</h1>
          <p className="text-sm text-white/40">Track your API spending over the last 30 days</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl bg-white/5" />
        </div>
      ) : !data ? (
        <p className="text-white/40">Failed to load usage data.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={DollarSign}
              label="Today"
              value={`$${data.todayCost}`}
              sub={`${data.todayCalls} API calls`}
              color="#10b981"
            />
            <StatCard
              icon={TrendingUp}
              label="Last 30 days"
              value={`$${data.totalCost}`}
              sub={`${data.totalCalls} total calls`}
              color="#3b82f6"
            />
            <StatCard
              icon={Calendar}
              label="Daily average"
              value={`$${data.avgDailyCost}`}
              sub="per day"
              color="#f59e0b"
            />
            <StatCard
              icon={Zap}
              label="Projected monthly"
              value={`$${data.projectedMonthly}`}
              sub="at current rate"
              color="#a855f7"
            />
          </div>

          {/* Daily cost chart */}
          <div className="mb-8">
            <h2 className="text-sm font-medium text-white/40 mb-4">Daily spend (last 30 days)</h2>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-end gap-[2px] h-32">
                {data.daily.map((day, i) => {
                  const height = maxDailyCost > 0 ? (day.cost / maxDailyCost) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                      <div
                        className="w-full rounded-t bg-emerald-500/60 hover:bg-emerald-500/80 transition-colors min-h-[2px] cursor-pointer"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                        <div className="bg-[#333] text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                          {day.date}: ${(day.cost / 100).toFixed(4)} ({day.calls} calls)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-white/20">
                <span>{data.daily[0]?.date}</span>
                <span>{data.daily[data.daily.length - 1]?.date}</span>
              </div>
            </div>
          </div>

          {/* Cost by service */}
          <div className="mb-8">
            <h2 className="text-sm font-medium text-white/40 mb-4">Cost by service</h2>
            <div className="space-y-3">
              {Object.entries(data.byService)
                .sort(([, a], [, b]) => b.cost - a.cost)
                .map(([service, stats]) => {
                  const meta = SERVICE_META[service] || {
                    label: service,
                    icon: Zap,
                    color: "#6b7280",
                  };
                  const Icon = meta.icon;
                  const totalServiceCost = Object.values(data.byService).reduce((s, v) => s + v.cost, 0);
                  const pct = totalServiceCost > 0 ? (stats.cost / totalServiceCost) * 100 : 0;

                  return (
                    <div
                      key={service}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                    >
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${meta.color}20` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-white/80">{meta.label}</p>
                          <p className="text-sm font-mono text-white/60">
                            ${(stats.cost / 100).toFixed(4)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: meta.color }}
                            />
                          </div>
                          <span className="text-[10px] text-white/30 shrink-0">
                            {stats.calls} calls · {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Cost reference */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="text-sm font-medium text-white/40 mb-3">API cost reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between text-white/50">
                <span>Whisper transcription</span>
                <span className="font-mono">~$0.006/min</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Claude summarization</span>
                <span className="font-mono">~$0.015/summary</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Claude chat message</span>
                <span className="font-mono">~$0.005/msg</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>OpenAI embedding</span>
                <span className="font-mono">~$0.00002/embed</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <p className="text-xl font-bold font-mono text-white">{value}</p>
      <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>
    </div>
  );
}
