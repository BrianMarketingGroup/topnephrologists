"use client";

import { Star, MapPin, Building2 } from "lucide-react";
import type { UploadedFileMeta } from "@/lib/store/checkoutStore";
import type { SelectedMarket } from "@/lib/checkoutMarkets";

export default function ListingPreviewMockup({
  businessName,
  bio,
  people,
  market,
  logo,
  hasFeatured,
}: {
  businessName: string;
  bio: string;
  people?: string;
  market: SelectedMarket | null;
  logo?: UploadedFileMeta;
  hasFeatured?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
        Basic Listing Preview
      </p>
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob: object URL, next/image can't optimize it
            <img src={logo.previewUrl} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <Building2 size={22} className="text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="font-bold text-primary truncate">
              {businessName || "Your Practice Name"}
            </h3>
            <div className="flex text-accent shrink-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={12} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
          </div>
          {market && (
            <p className="flex items-center gap-1 text-xs text-muted mb-1">
              <MapPin size={12} /> {market.city}, {market.state}
            </p>
          )}
          {people && <p className="text-xs text-muted mb-1 truncate">{people}</p>}
          <p className="text-sm text-dark line-clamp-2">
            {bio || "Your practice description will appear here once you add a bio below."}
          </p>
        </div>
      </div>
      {hasFeatured && (
        <p className="text-xs text-accent-dark mt-4 pt-4 border-t border-border">
          Featured Listings are specially designed by our expert design team.
        </p>
      )}
    </div>
  );
}
