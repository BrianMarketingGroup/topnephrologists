"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";
import FadeIn from "@/components/ui/FadeIn";
import Button from "@/components/ui/Button";
import MarketCard from "@/components/checkout/MarketCard";
import MarketSearch, { type MarketSearchResults } from "@/components/checkout/MarketSearch";
import SpecialtySelector from "@/components/checkout/SpecialtySelector";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import {
  useMarkets,
  getNearbyMarketsAsync,
  loadPopulationForMarkets,
  loadFeaturedAvailabilityForMarkets,
  type Market,
} from "@/lib/checkoutMarkets";
import { marketSelectionSchema } from "@/lib/checkoutSchema";
import type { SiteConfig } from "@/lib/config";

const RADIUS_OPTIONS_MILES = [10, 25, 50, 100];
const NEARBY_PAGE_SIZE = 8;

export default function Step1SelectMarket({ config }: { config: SiteConfig }) {
  const selectedMarkets = useCheckoutStore((s) => s.selectedMarkets);
  const specialtyIds = useCheckoutStore((s) => s.specialtyIds);
  const addMarket = useCheckoutStore((s) => s.addMarket);
  const removeMarket = useCheckoutStore((s) => s.removeMarket);
  const goNext = useCheckoutStore((s) => s.goNext);

  const { getMarketById } = useMarkets();

  const [searchResults, setSearchResults] = useState<MarketSearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped to force MarketSearch to remount with a blank input once a city
  // is added from search — that's what makes the search-results section
  // collapse away (see handleAddFromSearch) instead of lingering on screen.
  const [searchResetKey, setSearchResetKey] = useState(0);

  const [radiusMiles, setRadiusMiles] = useState(50);
  const [rawNearbyMarkets, setRawNearbyMarkets] = useState<Market[]>([]);
  const [nearbyTotal, setNearbyTotal] = useState(0);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyLoadingMore, setNearbyLoadingMore] = useState(false);

  const selectedAsMarkets = selectedMarkets
    .map((m) => getMarketById(m.marketId))
    .filter((m): m is Market => Boolean(m));

  // Adding from the live search results collapses that section entirely
  // (clears the query + results) instead of leaving it on screen — the
  // added city still shows up in the persistent "Your Selected Markets"
  // section below, and "Nearby to X" moves up into view.
  function handleAddFromSearch(marketId: string) {
    addMarket(marketId);
    setSearchResults(null);
    setSearchResetKey((k) => k + 1);
  }

  const lastSelected = selectedMarkets[selectedMarkets.length - 1] ?? null;
  const lastSelectedMarket = lastSelected ? getMarketById(lastSelected.marketId) : null;

  // New target city or radius starts the page over from scratch — whatever
  // was accumulated for the previous target/radius no longer applies.
  useEffect(() => {
    if (!lastSelectedMarket) {
      setRawNearbyMarkets([]);
      setNearbyTotal(0);
      return;
    }
    let cancelled = false;
    setNearbyLoading(true);
    getNearbyMarketsAsync(lastSelectedMarket, radiusMiles, { limit: NEARBY_PAGE_SIZE, offset: 0 }).then(
      (page) => {
        if (!cancelled) {
          setRawNearbyMarkets(page.items);
          setNearbyTotal(page.total);
          setNearbyLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [lastSelectedMarket?.id, radiusMiles]);

  function handleLoadMoreNearby() {
    if (!lastSelectedMarket) return;
    setNearbyLoadingMore(true);
    getNearbyMarketsAsync(lastSelectedMarket, radiusMiles, {
      limit: NEARBY_PAGE_SIZE,
      offset: rawNearbyMarkets.length,
    }).then((page) => {
      setRawNearbyMarkets((prev) => [...prev, ...page.items]);
      setNearbyTotal(page.total);
      setNearbyLoadingMore(false);
    });
  }

  const nearbyMarkets = rawNearbyMarkets
    .filter((n) => !selectedMarkets.some((m) => m.marketId === n.id))
    // Re-read each from the live registry so async-loaded population + Featured
    // availability actually reach these cards. rawNearbyMarkets holds the
    // pre-fetch object references; since MarketCard is memo()'d on the market
    // prop and the loaders REPLACE (not mutate) registry entries, rendering the
    // raw state leaves nearby cards stale (no population, no Featured badge) —
    // the same reason selectedAsMarkets maps through getMarketById above.
    .map((n) => getMarketById(n.id) ?? n);
  const hasMoreNearby = rawNearbyMarkets.length < nearbyTotal;

  // Real population + Featured availability only get fetched for whichever
  // markets are actually on screen right now, batched into one request each
  // — not the full ~40k-city list. Markets are shared objects (via
  // marketRegistry), so this updates every card showing a given city once
  // it resolves.
  const visibleMarkets = [
    ...(searchResults?.results ?? []),
    ...selectedAsMarkets,
    ...nearbyMarkets,
  ];
  const visibleMarketsKey = visibleMarkets.map((m) => m.id).join(",");

  useEffect(() => {
    loadPopulationForMarkets(visibleMarkets);
    loadFeaturedAvailabilityForMarkets(visibleMarkets);
    // visibleMarketsKey is the intentional dependency — it's a stable summary
    // of which markets are visible, avoiding re-running on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMarketsKey]);

  function handleContinue() {
    const result = marketSelectionSchema.safeParse({
      selectedMarkets,
      specialtyIds,
      specialtyRequired: config.specialty?.required ?? false,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Please complete this step to continue.");
      return;
    }
    setError(null);
    goNext();
  }

  return (
    <FadeIn>
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold text-primary mb-1">
            Select your {config.marketLabel.toLowerCase()}
          </h2>
          <p className="text-sm text-muted mb-4">
            Choose one or more markets for your listing.
          </p>
          <MarketSearch key={searchResetKey} config={config} onResults={setSearchResults} />
        </div>

        {searchResults !== null && searchResults.results.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
              Search Results
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {searchResults.results.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  isSelected={selectedMarkets.some((m) => m.marketId === market.id)}
                  pricePerYear={config.listingTier.basePrice}
                  onAdd={handleAddFromSearch}
                  onRemove={removeMarket}
                />
              ))}
            </div>
          </div>
        )}

        {searchResults !== null && searchResults.results.length === 0 && (
          <p className="text-sm text-muted italic">No cities match your search.</p>
        )}

        {searchResults?.hasMore && (
          <p className="text-xs text-muted italic">
            Showing top {searchResults.results.length} matches — refine your search for more.
          </p>
        )}

        {/* Always visible regardless of search state, so a previously-added
            city never appears to vanish while you search for another one. */}
        {selectedAsMarkets.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
              Your Selected Markets
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedAsMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  isSelected
                  pricePerYear={config.listingTier.basePrice}
                  onAdd={addMarket}
                  onRemove={removeMarket}
                />
              ))}
            </div>
          </div>
        )}

        {lastSelectedMarket && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <AnimatePresence mode="wait">
                <motion.p
                  key={lastSelectedMarket.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Nearby to {lastSelectedMarket.city}, {lastSelectedMarket.state}
                </motion.p>
              </AnimatePresence>
              <label className="flex items-center gap-1.5 text-xs text-muted">
                Within
                <select
                  value={radiusMiles}
                  onChange={(e) => setRadiusMiles(Number(e.target.value))}
                  className="rounded-md border border-border bg-card px-1.5 py-1 text-xs text-dark"
                >
                  {RADIUS_OPTIONS_MILES.map((miles) => (
                    <option key={miles} value={miles}>
                      {miles} mi
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {nearbyLoading && nearbyMarkets.length === 0 ? (
              <p className="text-sm text-muted italic">Finding nearby cities…</p>
            ) : nearbyMarkets.length > 0 ? (
              // `layout` smooths any height change as the list swaps; the
              // previous (possibly stale) list stays visible and just dims
              // while a refetch is in flight, instead of collapsing to a
              // loading line and popping back — avoids the flash + page jump.
              <motion.div
                layout
                className={clsx(
                  "grid grid-cols-1 sm:grid-cols-2 gap-3 transition-opacity duration-300",
                  nearbyLoading ? "opacity-40 pointer-events-none" : "opacity-100",
                )}
              >
                {nearbyMarkets.map((market) => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    isSelected={false}
                    pricePerYear={config.listingTier.basePrice}
                    onAdd={addMarket}
                    onRemove={removeMarket}
                  />
                ))}
              </motion.div>
            ) : (
              <p className="text-sm text-muted italic">
                No cities found within {radiusMiles} miles.
              </p>
            )}
            {hasMoreNearby && (
              <div className="mt-3 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLoadMoreNearby}
                  disabled={nearbyLoadingMore || nearbyLoading}
                >
                  {nearbyLoadingMore ? "Loading…" : "View More"}
                </Button>
              </div>
            )}
          </div>
        )}

        {config.specialty && <SpecialtySelector config={config} />}

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between">
          {selectedMarkets.length > 0 ? (
            <p className="text-sm text-muted">
              {selectedMarkets.length} {config.marketLabel.toLowerCase()}
              {selectedMarkets.length === 1 ? "" : "s"} selected
            </p>
          ) : (
            <span />
          )}
          <Button onClick={handleContinue}>Continue</Button>
        </div>
      </div>
    </FadeIn>
  );
}
