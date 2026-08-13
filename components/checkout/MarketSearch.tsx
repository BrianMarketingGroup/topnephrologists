"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/FormField";
import type { SiteConfig } from "@/lib/config";
import { useMarkets, searchByZipAsync, type MarketSearchResult } from "@/lib/checkoutMarkets";

export type MarketSearchResults = MarketSearchResult;

interface MarketSearchProps {
  config: SiteConfig;
  onResults: (results: MarketSearchResults | null) => void;
}

const DEBOUNCE_MS = 200;
const ZIP_PATTERN = /^\d{5}$/;

export default function MarketSearch({ config, onResults }: MarketSearchProps) {
  const [query, setQuery] = useState("");
  const { loading, searchMarkets } = useMarkets();
  // Guards against a slower, earlier zip lookup overwriting the result of a
  // faster, later one if the user keeps typing.
  const latestQueryRef = useRef("");

  useEffect(() => {
    const trimmed = query.trim();
    latestQueryRef.current = trimmed;

    if (!trimmed) {
      onResults(null);
      return;
    }

    const timer = setTimeout(() => {
      if (ZIP_PATTERN.test(trimmed)) {
        searchByZipAsync(trimmed).then((market) => {
          if (latestQueryRef.current !== trimmed) return;
          onResults(market ? { results: [market], hasMore: false } : { results: [], hasMore: false });
        });
        return;
      }
      onResults(searchMarkets(trimmed));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={
          loading ? "Loading cities…" : `Search by ${config.marketLabel.toLowerCase()} or ZIP…`
        }
        disabled={loading}
        className="pl-9"
      />
    </div>
  );
}
