"use client";

import { clsx } from "clsx";
import { Check, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/pricing";

export default function FeaturedCityCheckbox({
  city,
  state,
  price,
  isSelected,
  onToggle,
}: {
  city: string;
  state: string;
  price: number;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        "flex items-center justify-between gap-4 rounded-xl border-2 p-4 text-left w-full transition-colors",
        isSelected
          ? "border-accent bg-gradient-to-r from-accent/10 to-transparent"
          : "border-border bg-card hover:border-accent/40",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            isSelected ? "bg-accent text-primary-dark" : "bg-muted/10 text-muted",
          )}
        >
          <Zap size={16} fill={isSelected ? "currentColor" : "none"} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-dark truncate">
            {city}, {state}
          </p>
          <p className="text-xs text-accent-dark font-semibold">
            +{formatCurrency(price)} for Featured Placement
          </p>
        </div>
      </div>
      <span
        className={clsx(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
          isSelected ? "bg-accent border-accent text-primary-dark" : "border-border",
        )}
      >
        {isSelected && <Check size={14} />}
      </span>
    </button>
  );
}
