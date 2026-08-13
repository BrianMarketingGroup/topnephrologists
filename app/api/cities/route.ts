import { NextResponse } from "next/server";

// Proxies the full city list from the BFF, cached in-memory for an hour —
// the list is ~40k rows and effectively static within that window, so this
// avoids re-fetching it from the BFF on every page load.
const TTL_MS = 60 * 60 * 1000;
let cache: { data: unknown; expiresAt: number } | null = null;

export async function GET() {
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.data);
  }

  const base = process.env.BIG_SWING_BFF_URL;
  if (!base) return NextResponse.json({ items: [] });

  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/v1/cities`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ items: [] });
    const data = await res.json();
    cache = { data, expiresAt: Date.now() + TTL_MS };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ items: [] });
  }
}
