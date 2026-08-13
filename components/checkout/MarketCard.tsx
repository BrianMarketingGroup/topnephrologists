"use client";

import { memo } from "react";
import { clsx } from "clsx";
import { Plus, Check } from "lucide-react";
import type { Market } from "@/lib/checkoutMarkets";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/pricing";

function formatPopulation(n: number): string {
  return n.toLocaleString("en-US");
}

interface MarketCardProps {
  market: Market;
  isSelected: boolean;
  pricePerYear: number;
  onAdd: (marketId: string) => void;
  onRemove: (marketId: string) => void;
}

function MarketCard({ market, isSelected, pricePerYear, onAdd, onRemove }: MarketCardProps) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors",
        isSelected ? "border-accent bg-accent/5" : "border-border bg-card",
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold text-dark truncate">
          {market.city}, {market.state}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {market.population > 0 && `Population ${formatPopulation(market.population)} · `}
          {formatCurrency(pricePerYear)}/yr
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            Listing Available
          </span>
          {/* Real per-city check (/api/cities/availability, same one Step 4
              uses) — omitted entirely while unknown (null) rather than
              guessing, so a card never flashes a wrong state. */}
          {market.featuredAvailable === true && (
            <span className="inline-flex items-center rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent-dark">
              Featured Available
            </span>
          )}
          {market.featuredAvailable === false && (
            <span className="inline-flex items-center rounded-full bg-muted/10 px-2.5 py-1 text-xs font-semibold text-muted">
              Featured Sold Out
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0">
        {isSelected ? (
          <Button variant="secondary" size="sm" type="button" onClick={() => onRemove(market.id)}>
            <Check size={14} /> Added
          </Button>
        ) : (
          <Button variant="outline" size="sm" type="button" onClick={() => onAdd(market.id)}>
            <Plus size={14} /> Add
          </Button>
        )}
      </div>
    </div>
  );
}

export default memo(MarketCard);
