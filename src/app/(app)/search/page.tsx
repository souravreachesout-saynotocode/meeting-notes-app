"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import type { SearchResult } from "@/types";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search as SearchIcon, FileText } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      // Use a 0ms timeout to avoid synchronous setState in effect
      debounceRef.current = setTimeout(() => {
        setResults([]);
        setSearched(false);
      }, 0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`
        );
        const data = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      }
      setLoading(false);
      setSearched(true);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">Search Meetings</h1>

      <div className="relative mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transcripts and summaries..."
          className="pl-10"
          autoFocus
        />
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No results found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, i) => (
            <Link key={i} href={`/meetings/${result.meeting_id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm">
                      {result.meeting_title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {result.source}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(result.meeting_date), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {result.snippet}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Search across all your meeting transcripts and summaries</p>
        </div>
      )}
    </div>
  );
}
