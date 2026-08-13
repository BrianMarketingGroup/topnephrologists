"use client";

import { useEffect, useState } from "react";
import { US_STATES } from "@/content/states";

export interface Market {
  id: string;
  city: string;
  state: string;
  population: number;
  // null = not yet checked. Real per-city data from /api/cities/availability
  // (the same BFF-backed featured-claims check Step 4 uses) — not a stub.
  featuredAvailable: boolean | null;
}

export interface SelectedMarket {
  marketId: string;
  city: string;
  state: string;
  // Featured Placement (City Spotlight) is sold per city here, not per
  // (city, industry) pair — a single toggle per selected market.
  featured: boolean;
}

export const ALL_STATES: string[] = Array.from(new Set(US_STATES.map((s) => s.abbr))).sort();

interface CityRead {
  city: string | null;
  state: string | null;
  state_full: string | null;
  county: string | null;
}

interface NearbyCityRead extends CityRead {
  distance_miles: number;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Every Market ever seen (from either /api/cities or /api/cities_nearby) is
// registered here by id, so getMarketById works regardless of which fetch
// resolves first — a nearby-city card can be "Add"ed even if the full
// /api/cities list hasn't finished loading yet.
const marketRegistry = new Map<string, Market>();

// Precomputed once per market so searchMarkets isn't calling .toLowerCase()
// on the full ~40k-city list on every keystroke.
const cityLowerById = new Map<string, string>();

function toMarket(c: CityRead): Market | null {
  if (!c.city || !c.state) return null;
  const id = slugify(`${c.city}-${c.state}`);
  const existing = marketRegistry.get(id);
  if (existing) return existing;
  const market: Market = {
    id,
    city: c.city,
    state: c.state,
    population: 0,
    featuredAvailable: null,
  };
  marketRegistry.set(id, market);
  cityLowerById.set(id, c.city.toLowerCase());
  return market;
}

const LOAD_CHUNK_SIZE = 2000;

// Maps items into Markets in batches, yielding to the event loop between
// batches. The real city list is ~40k rows — mapping it in one synchronous
// pass (plus the regex-based slugify per row) can block the main thread long
// enough to feel like a freeze; chunking keeps the tab responsive while it loads.
async function mapMarketsInChunks(items: CityRead[]): Promise<Market[]> {
  const result: Market[] = [];
  for (let i = 0; i < items.length; i += LOAD_CHUNK_SIZE) {
    for (const item of items.slice(i, i + LOAD_CHUNK_SIZE)) {
      const market = toMarket(item);
      if (market) result.push(market);
    }
    if (i + LOAD_CHUNK_SIZE < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return result;
}

let allMarkets: Market[] = [];
let marketsPromise: Promise<Market[]> | null = null;
const listeners = new Set<() => void>();

function loadMarkets(): Promise<Market[]> {
  if (!marketsPromise) {
    marketsPromise = fetch("/api/cities")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then(async (data: { items: CityRead[] }) => {
        allMarkets = await mapMarketsInChunks(data.items);
        listeners.forEach((notify) => notify());
        return allMarkets;
      })
      .catch(() => {
        allMarkets = [];
        return allMarkets;
      });
  }
  return marketsPromise;
}

export function getMarketById(id: string): Market | undefined {
  return marketRegistry.get(id);
}

const DEFAULT_SEARCH_LIMIT = 50;

export interface MarketSearchResult {
  results: Market[];
  hasMore: boolean;
}

// Lets "Springfield, IL" / "Springfield IL" / "Springfield, Illinois"
// disambiguate a common city name that exists in dozens of states — a plain
// "Springfield" search can't tell which one the user means.
const STATE_ABBR_BY_NAME: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

const VALID_STATE_ABBRS = new Set(Object.values(STATE_ABBR_BY_NAME));

/** Resolves "IL" or "Illinois" (any case) to "IL"; null if unrecognized. */
function resolveStateQuery(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s.length === 2 && VALID_STATE_ABBRS.has(s.toUpperCase())) return s.toUpperCase();
  return STATE_ABBR_BY_NAME[s] ?? null;
}

/**
 * Splits "Springfield, IL", "Springfield, Illinois", or "Springfield IL"
 * into a city part and a resolved 2-letter state code. A comma is preferred
 * (handles multi-word full state names, e.g. "Springfield, North Carolina");
 * with no comma, only a bare trailing 2-letter code is recognized — a
 * multi-word state name with no comma is too ambiguous to guess (would
 * require deciding how many trailing words belong to the state vs. the
 * city). If nothing resolves, the whole trimmed string is the city part.
 */
function parseCityStateQuery(trimmed: string): { cityQuery: string; stateQuery: string | null } {
  const commaIndex = trimmed.lastIndexOf(",");
  if (commaIndex !== -1) {
    const cityPart = trimmed.slice(0, commaIndex).trim();
    if (cityPart) {
      return { cityQuery: cityPart, stateQuery: resolveStateQuery(trimmed.slice(commaIndex + 1)) };
    }
  }

  const spaceMatch = trimmed.match(/^(.+?)\s+([a-zA-Z]{2})$/);
  if (spaceMatch) {
    const resolvedState = resolveStateQuery(spaceMatch[2]);
    if (resolvedState) {
      return { cityQuery: spaceMatch[1].trim(), stateQuery: resolvedState };
    }
  }

  return { cityQuery: trimmed, stateQuery: null };
}

/**
 * Cases where `city` starts with the query rank ahead of ones that merely
 * contain it, and results are capped at `limit` so a broad query (e.g. a
 * single letter) doesn't render hundreds of cards at once. `hasMore`
 * indicates whether matches were truncated by the cap.
 *
 * Supports an optional state qualifier ("Springfield, IL", "Springfield IL",
 * or "Springfield, Illinois") to disambiguate a city name that exists in
 * many states. An unrecognized state qualifier is ignored, not treated as
 * part of the city name, so a typo there never zeroes out the results.
 */
export function searchMarkets(
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
): MarketSearchResult {
  const trimmed = query.trim();
  if (!trimmed) return { results: [], hasMore: false };

  const { cityQuery, stateQuery } = parseCityStateQuery(trimmed);
  const q = cityQuery.toLowerCase();
  if (!q) return { results: [], hasMore: false };

  const startsWith: Market[] = [];
  const contains: Market[] = [];
  for (const m of allMarkets) {
    if (stateQuery && m.state.trim().toUpperCase() !== stateQuery) continue;
    const cityLower = cityLowerById.get(m.id) ?? m.city.toLowerCase();
    if (cityLower.startsWith(q)) {
      startsWith.push(m);
    } else if (cityLower.includes(q)) {
      contains.push(m);
    }
  }

  const combined = [...startsWith, ...contains];
  return {
    results: combined.slice(0, limit),
    hasMore: combined.length > limit,
  };
}

/** Loads (once, shared across all callers) and exposes the real city list. */
export function useMarkets() {
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(allMarkets.length === 0);

  useEffect(() => {
    const rerender = () => setTick((t) => t + 1);
    listeners.add(rerender);
    loadMarkets().finally(() => setLoading(false));
    return () => {
      listeners.delete(rerender);
    };
  }, []);

  return { loading, searchMarkets, getMarketById };
}

export interface NearbyMarketsPage {
  items: Market[];
  // Full within-radius count *before* limit/offset slicing — keep
  // requesting with a larger offset (e.g. a "View More" button) until
  // offset + items.length >= total.
  total: number;
}

/**
 * Real, distance-sorted nearby cities within `radiusMiles` of `market`,
 * paginated via `limit`/`offset` (mirrors the BFF's `/cities_nearby` params
 * exactly) — a caller keeps the same radius/target and increases `offset`
 * by `limit` to fetch the next page.
 */
export async function getNearbyMarketsAsync(
  market: Market,
  radiusMiles: number,
  { limit = 8, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<NearbyMarketsPage> {
  try {
    const params = new URLSearchParams({
      city: market.city,
      state: market.state,
      radius_miles: String(radiusMiles),
      limit: String(limit),
      offset: String(offset),
    });
    const res = await fetch(`/api/cities_nearby?${params.toString()}`);
    if (!res.ok) return { items: [], total: 0 };
    const data: { items: NearbyCityRead[]; total: number } = await res.json();
    return {
      items: data.items.map(toMarket).filter((m): m is Market => m !== null),
      total: data.total,
    };
  } catch {
    return { items: [], total: 0 };
  }
}

/** Resolves an exact 5-digit zip code to its city, or `null` if unresolved. */
export async function searchByZipAsync(zipCode: string): Promise<Market | null> {
  try {
    const res = await fetch(`/api/zips_search?zip_code=${encodeURIComponent(zipCode)}`);
    if (!res.ok) return null;
    const data: { items: CityRead[] } = await res.json();
    const [first] = data.items;
    return first ? toMarket(first) : null;
  } catch {
    return null;
  }
}

interface CityPopulationRead {
  city: string;
  state: string;
  population: number;
}

const POPULATION_BATCH_SIZE = 100; // matches the BFF's per-request cap
const populationRequested = new Set<string>();

/**
 * Batch-fetches real population (summed from zips) for whichever markets are
 * currently visible, and mutates those shared `Market` objects in place —
 * since every occurrence of a market on the page is the same object
 * reference (via `marketRegistry`), this single fetch updates the number
 * everywhere it's shown once `listeners` are notified to re-render.
 * Markets already carrying a real population, or already requested this
 * session, are skipped — so re-renders don't keep re-fetching.
 */
export async function loadPopulationForMarkets(markets: Market[]): Promise<void> {
  const needing = markets.filter((m) => m.population === 0 && !populationRequested.has(m.id));
  if (needing.length === 0) return;
  needing.forEach((m) => populationRequested.add(m.id));

  let changed = false;
  for (let i = 0; i < needing.length; i += POPULATION_BATCH_SIZE) {
    const batch = needing.slice(i, i + POPULATION_BATCH_SIZE);
    const params = new URLSearchParams();
    for (const m of batch) {
      params.append("cities", `${m.city}|${m.state}`);
    }
    try {
      const res = await fetch(`/api/cities_population?${params.toString()}`);
      if (!res.ok) continue;
      const data: { items: CityPopulationRead[] } = await res.json();
      for (const item of data.items) {
        const id = slugify(`${item.city}-${item.state}`);
        const market = marketRegistry.get(id);
        if (market && item.population > 0) {
          // Replace (not mutate) — MarketCard is memo()'d on the `market`
          // prop, so mutating population in place leaves the object
          // reference unchanged and memo silently skips the re-render.
          marketRegistry.set(id, { ...market, population: item.population });
          changed = true;
        }
      }
    } catch {
      // best-effort — those markets just keep displaying no population line
    }
  }
  if (changed) listeners.forEach((notify) => notify());
}

const featuredAvailabilityRequested = new Set<string>();

/**
 * Batch-checks real Featured Placement (City Spotlight) availability for
 * whichever markets are currently visible, via the same
 * /api/cities/availability route Step 4 uses (BFF featured-claims, Sheet
 * fallback) — not the always-true stub some reference implementations use.
 * Markets already checked this session are skipped, same pattern as
 * loadPopulationForMarkets.
 */
export async function loadFeaturedAvailabilityForMarkets(markets: Market[]): Promise<void> {
  const needing = markets.filter(
    (m) => m.featuredAvailable === null && !featuredAvailabilityRequested.has(m.id),
  );
  if (needing.length === 0) return;
  needing.forEach((m) => featuredAvailabilityRequested.add(m.id));

  try {
    const cities = needing.map((m) => ({ city: m.city, state: m.state }));
    const params = new URLSearchParams({ cities: JSON.stringify(cities) });
    const res = await fetch(`/api/cities/availability?${params.toString()}`);
    if (!res.ok) return;
    const data: { takenSlots: string[] } = await res.json();
    let changed = false;
    for (const m of needing) {
      const isAvailable = !data.takenSlots.includes(`${m.city}|${m.state}`);
      const current = marketRegistry.get(m.id);
      if (current) {
        // Replace (not mutate) — same memo()'d-MarketCard reasoning as population.
        marketRegistry.set(m.id, { ...current, featuredAvailable: isAvailable });
        changed = true;
      }
    }
    if (changed) listeners.forEach((notify) => notify());
  } catch {
    // best-effort — those markets just keep showing no Featured badge
  }
}
