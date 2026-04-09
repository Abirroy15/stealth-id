// GET /api/per/private-balance?address=...  (ephemeral rollup balance)
import { NextRequest, NextResponse } from "next/server";
import { perPrivateBalance } from "@/lib/per";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });
  try {
    const bal = await perPrivateBalance(address);
    return NextResponse.json(bal);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

// Also support POST for backwards compatibility
export async function POST(req: NextRequest) {
  const { wallet, address } = await req.json();
  const addr = address ?? wallet;
  if (!addr) return NextResponse.json({ error: "address or wallet required" }, { status: 400 });
  try {
    const bal = await perPrivateBalance(addr);
    return NextResponse.json(bal);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
