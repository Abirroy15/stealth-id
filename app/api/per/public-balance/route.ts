// GET /api/per/public-balance?address=...  (base chain SPL balance)
import { NextRequest, NextResponse } from "next/server";
import { perBalance } from "@/lib/per";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });
  try {
    const bal = await perBalance(address);
    return NextResponse.json(bal);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
