"use client";

import { X } from "lucide-react";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import type { SiteConfig } from "@/lib/config";
import { calculateQuote, formatCurrency } from "@/lib/pricing";

export default function OrderSummarySidebar({ config }: { config: SiteConfig }) {
  const selectedMarkets = useCheckoutStore((s) => s.selectedMarkets);
  const specialtyIds = useCheckoutStore((s) => s.specialtyIds);
  const removeMarket = useCheckoutStore((s) => s.removeMarket);

  const areaOptions = config.specialty?.options ?? [];
  const selectedAreaLabels = areaOptions
    .filter((o) => specialtyIds.includes(o.id))
    .map((o) => o.label);

  const featured = selectedMarkets.some((m) => m.featured);
  const excludedFeatured = selectedMarkets
    .filter((m) => !m.featured)
    .map((m) => `${m.city}|${m.state}`);

  const quote = calculateQuote({
    cities: selectedMarkets.map((m) => ({ city: m.city, state: m.state })),
    featured,
    excludedFeatured,
  });

  return (
    <aside className="bg-card border border-border rounded-2xl p-6 sticky top-6 h-fit">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">
        Order Summary
      </h2>

      <dl className="space-y-2 text-sm mb-4">
        <div>
          <dt className="text-muted mb-1">Market(s)</dt>
          {selectedMarkets.length > 0 ? (
            <ul className="space-y-1">
              {selectedMarkets.map((m) => (
                <li key={m.marketId} className="flex items-center justify-between gap-2">
                  <span className="text-dark font-medium">
                    {m.city}, {m.state}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMarket(m.marketId)}
                    className="text-muted hover:text-danger shrink-0"
                    aria-label={`Remove ${m.city}, ${m.state}`}
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <dd className="text-dark font-medium">None selected</dd>
          )}
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Listing Type</dt>
          <dd className="text-dark font-medium">{config.listingTier.label}</dd>
        </div>
        {config.specialty && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{config.specialty.label}</dt>
            <dd className="text-right text-dark font-medium">
              {selectedAreaLabels.length > 0 ? selectedAreaLabels.join(", ") : "—"}
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Quantity</dt>
          <dd className="text-dark font-medium">{selectedMarkets.length}</dd>
        </div>
      </dl>

      <div className="border-t border-border pt-4 space-y-2">
        {quote.lineItems.map((li, i) => (
          <div key={i} className="flex justify-between gap-4 text-sm">
            <span className="text-muted">{li.label}</span>
            <span className="text-dark font-medium">{formatCurrency(li.amount)}</span>
          </div>
        ))}
        {quote.lineItems.length === 0 && (
          <p className="text-sm text-muted italic">No items selected yet.</p>
        )}
      </div>

      <div className="border-t border-border mt-4 pt-4 flex justify-between items-baseline">
        <span className="text-base font-semibold text-primary">Grand Total</span>
        <span className="text-2xl font-bold text-primary">{formatCurrency(quote.total)}</span>
      </div>
    </aside>
  );
}
