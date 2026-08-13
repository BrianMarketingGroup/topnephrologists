"use client";

import { useEffect, useState } from "react";
import FadeIn from "@/components/ui/FadeIn";
import Button from "@/components/ui/Button";
import UpsellCard from "@/components/checkout/UpsellCard";
import FeaturedCityCheckbox from "@/components/checkout/FeaturedCityCheckbox";
import FeaturedCitySoldOut from "@/components/checkout/FeaturedCitySoldOut";
import FeaturedCityOffer from "@/components/checkout/FeaturedCityOffer";
import OrderSummarySidebar from "@/components/checkout/OrderSummarySidebar";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { buildDealCreatePayload } from "@/lib/submission";
import type { SiteConfig } from "@/lib/config";

export default function Step4Upsells({ config }: { config: SiteConfig }) {
  const selectedMarkets = useCheckoutStore((s) => s.selectedMarkets);
  const specialtyIds = useCheckoutStore((s) => s.specialtyIds);
  const contact = useCheckoutStore((s) => s.contact);
  const plaqueShipping = useCheckoutStore((s) => s.plaqueShipping);
  const payment = useCheckoutStore((s) => s.payment);
  const trafficSource = useCheckoutStore((s) => s.trafficSource);
  const landingPage = useCheckoutStore((s) => s.landingPage);
  const toggleMarketFeatured = useCheckoutStore((s) => s.toggleMarketFeatured);
  const selectedUpsellIds = useCheckoutStore((s) => s.selectedUpsellIds);
  const toggleUpsell = useCheckoutStore((s) => s.toggleUpsell);
  const setDealId = useCheckoutStore((s) => s.setDealId);
  const goNext = useCheckoutStore((s) => s.goNext);
  const goBack = useCheckoutStore((s) => s.goBack);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [takenSlots, setTakenSlots] = useState<string[]>([]);

  useEffect(() => {
    if (selectedMarkets.length === 0) {
      setTakenSlots([]);
      return;
    }
    const cities = selectedMarkets.map((m) => ({ city: m.city, state: m.state }));
    const params = new URLSearchParams({
      cities: JSON.stringify(cities),
    });
    fetch(`/api/cities/availability?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { takenSlots: [] }))
      .then((data) => setTakenSlots(data.takenSlots ?? []))
      .catch(() => setTakenSlots([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selectedMarkets.map((m) => `${m.city}|${m.state}`))]);

  const featuredEligible = selectedMarkets.filter(
    (m) => !takenSlots.includes(`${m.city}|${m.state}`),
  );
  const featuredSoldOut = selectedMarkets.filter((m) =>
    takenSlots.includes(`${m.city}|${m.state}`),
  );
  // One shared preview below the checkbox list, not one per city — the
  // first city currently checked for featured, falling back to the first
  // eligible one so there's always something to preview.
  const previewMarket =
    featuredEligible.find((m) => m.featured) ?? featuredEligible[0] ?? null;

  // This is where the deal is actually saved — leaving this step for real
  // creates it (POST /api/v1/deals). Once that succeeds there's no going
  // back to steps 1-4 (see checkoutStore's goBack/goToStep); Step 5 becomes
  // an update against this same deal, never a second create.
  async function handleContinue() {
    setSaving(true);
    setError(null);
    try {
      const payload = buildDealCreatePayload({
        config,
        selectedMarkets,
        specialtyIds,
        contact,
        plaqueShipping,
        payment,
        trafficSource,
        landingPage,
      });
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("create failed");
      const deal = await res.json();
      setDealId(deal.id);
      goNext();
    } catch {
      setError("We couldn't save your order — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FadeIn>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {featuredEligible.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-primary mb-1">
                  Featured Placement is available for your selected markets
                </h2>
                <p className="text-sm text-muted">
                  Want to be the top {config.businessNoun} in each of these cities? Featured
                  listings get top placement and a highlighted badge. Only one company can be
                  featured per city.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {featuredEligible.map((m) => (
                  <FeaturedCityCheckbox
                    key={m.marketId}
                    city={m.city}
                    state={m.state}
                    price={config.featuredUpgradePrice}
                    isSelected={m.featured}
                    onToggle={() => toggleMarketFeatured(m.marketId)}
                  />
                ))}
              </div>
              {featuredSoldOut.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {featuredSoldOut.map((m) => (
                    <FeaturedCitySoldOut key={m.marketId} city={m.city} state={m.state} />
                  ))}
                </div>
              )}
              {previewMarket && (
                <FeaturedCityOffer
                  city={previewMarket.city}
                  state={previewMarket.state}
                  businessNoun={config.businessNoun}
                  price={config.featuredUpgradePrice}
                />
              )}
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-primary mb-1">Recommended Enhancements</h2>
            <p className="text-sm text-muted">
              Boost your visibility. Selections update your order total immediately.
            </p>
          </div>

          {config.upsells.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.upsells.map((upsell) => (
                <UpsellCard
                  key={upsell.id}
                  upsell={upsell}
                  isSelected={selectedUpsellIds.includes(upsell.id)}
                  onToggle={() => toggleUpsell(upsell.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted italic">
              There are no additional enhancements available for this listing at this time. If
              new premium features become available in the future, you&apos;ll be among the
              first to know.
            </p>
          )}

          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={goBack} disabled={saving}>
              Back
            </Button>
            <Button onClick={handleContinue} disabled={saving}>
              {saving ? "Saving…" : "Continue"}
            </Button>
          </div>
        </div>

        <OrderSummarySidebar config={config} />
      </div>
    </FadeIn>
  );
}
