"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import type { SearchResult } from "@/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search as SearchIcon, FileText, Sparkles, Zap } from "lucide-react";

interface SemanticResult extends SearchResult {
  similarity?: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SemanticResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mode, setMode] = useState<"text" | "smart">("smart");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      debounceRef.current = setTimeout(() => {
        setResults([]);
        setSearched(false);
      }, 0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const endpoint = mode === "smart"
          ? `/api/search/semantic?q=${encodeURIComponent(query.trim())}`
          : `/api/search?q=${encodeURIComponent(query.trim())}`;
        const res = await fetch(endpoint);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      }
      setLoading(false);
      setSearched(true);
    }, mode === "smart" ? 500 : 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, mode]);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-6">Search Meetings</h1>

      {/* Search mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("smart")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            mode === "smart"
              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
              : "bg-white/5 text-white/40 hover:text-white/60"
          }`}
        >
          <Sparkles className="h-3 w-3" />
          Smart Search
        </button>
        <button
          onClick={() => setMode("text")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            mode === "text"
              ? "bg-white/10 text-white border border-white/20"
              : "bg-white/5 text-white/40 hover:text-white/60"
          }`}
        >
          <Zap className="h-3 w-3" />
          Text Search
        </button>
      </div>

      <div className="relative mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === "smart" ? "Ask anything about your meetings..." : "Search transcripts and summaries..."}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
          autoFocus
        />
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12">
          <SearchIcon className="h-12 w-12 mx-auto mb-4 text-white/10" />
          <p className="text-white/40">No results found for &ldquo;{query}&rdquo;</p>
          {mode === "smart" && (
            <p className="text-xs text-white/20 mt-2">
              Try text search for exact keyword matches
            </p>
          )}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, i) => (
            <Link key={i} href={`/meetings/${result.meeting_id}`}>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm text-white/90">
                    {result.meeting_title}
                  </h3>
                  <div className="flex items-center gap-2">
                    {result.similarity && (
                      <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
                        {result.similarity}% match
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs text-white/40 border-white/10">
                      {result.source}
                    </Badge>
                    <span className="text-xs text-white/30">
                      {format(new Date(result.meeting_date), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-white/50 line-clamp-2">
                  {result.snippet}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-white/10" />
          <p className="text-white/40">
            {mode === "smart"
              ? "Ask questions like \"meetings about product roadmap\" or \"what did we decide about pricing?\""
              : "Search across all your meeting transcripts and summaries"}
          </p>
        </div>
      )}
    </div>
  );
}
