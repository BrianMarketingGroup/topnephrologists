import { NextRequest, NextResponse } from "next/server";

/* Simple in-memory rate limiter: max 5 submissions per IP per minute — same
 * policy as /api/apply, since this is now the real checkout-create endpoint. */
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

export async function POST(req: NextRequest) {
  const ip = getIp(req);
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

  const body = await req.json();

  // platform_id is the server's responsibility, not the client's: it comes from
  // BIG_SWING_PLATFORM_ID (a non-public env var, same source /api/apply uses) so
  // the browser never sees it and can't spoof which platform a deal lands on.
  // Injected last so the env value always wins over anything in the body.
  const platformId = process.env.BIG_SWING_PLATFORM_ID;
  const payload = {
    ...body,
    ...(platformId ? { platform_id: Number(platformId) } : {}),
  };

  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/v1/deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
