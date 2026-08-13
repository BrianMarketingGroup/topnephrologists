import { NextRequest, NextResponse } from "next/server";

// Cached per-query-string for 15 minutes — short enough that a stale radius
// change is never noticeable, long enough to absorb repeat lookups of the
// same city while a user is browsing Step 1.
const TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { data: unknown; expiresAt: number }>();

export async function GET(req: NextRequest) {
  const { search } = new URL(req.url);
  const cached = cache.get(search);
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(cached.data);
  }

  const base = process.env.BIG_SWING_BFF_URL;
  if (!base) return NextResponse.json({ items: [] });

  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/v1/cities_nearby${search}`, {
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ items: [] });
    const data = await res.json();
    cache.set(search, { data, expiresAt: Date.now() + TTL_MS });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ items: [] });
  }
}
