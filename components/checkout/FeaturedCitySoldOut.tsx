"use client";

import { Lock } from "lucide-react";

export default function FeaturedCitySoldOut({ city, state }: { city: string; state: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-danger/30 bg-danger/5 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
        <Lock size={16} />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-dark truncate">
          {city}, {state}
        </p>
        <p className="text-xs text-danger font-semibold">Featured is sold out</p>
      </div>
    </div>
  );
}
