import { NextRequest, NextResponse } from "next/server";

/* Fires the applicant "finish your listing later" welcome email for a deal, by
 * proxying to the reusable BFF endpoint. Same per-IP rate limit as the other
 * public write routes — this sends an email, so it's worth protecting from abuse. */
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${base.replace(/\/+$/, "")}/api/v1/deals/${id}/complete-later-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: { code: "bff_unreachable", message: "Could not reach the deals service." } },
      { status: 502 },
    );
  }
}
