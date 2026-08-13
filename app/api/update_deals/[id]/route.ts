import { NextRequest, NextResponse } from "next/server";

/* Same per-IP rate limit as /api/deals — this only merges into an existing
 * deal, but is still a public write endpoint worth protecting from abuse. */
const rateMap = new Map<string, { count: number; reset: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = getIp(request);
  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  const base = process.env.BIG_SWING_BFF_URL;
  if (!base) {
    return NextResponse.json(
      { error: { code: "bff_unreachable", message: "Could not reach the deals service." } },
      { status: 502 },
    );
  }

  const { id } = await params;
  const formData = await request.formData();

  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/v1/update_deals/${id}`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: { code: "bff_unreachable", message: "Could not reach the deals service." } },
      { status: 502 },
    );
  }
}
