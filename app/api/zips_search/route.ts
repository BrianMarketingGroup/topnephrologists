import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { search } = new URL(req.url);

  const base = process.env.BIG_SWING_BFF_URL;
  if (!base) return NextResponse.json({ items: [] });

  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/v1/zips_search${search}`, {
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ items: [] });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ items: [] });
  }
}
