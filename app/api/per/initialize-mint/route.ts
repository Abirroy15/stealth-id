// POST /api/per/initialize-mint  GET /api/per/initialize-mint?mint=...
import { NextRequest, NextResponse } from "next/server";
import { perInitializeMint, perIsMintInitialized, MINT } from "@/lib/per";

export async function POST(req: NextRequest) {
  try {
    const { owner, mint } = await req.json();
    if (!owner) return NextResponse.json({ error: "owner required" }, { status: 400 });
    const tx = await perInitializeMint(owner, mint ?? MINT);
    return NextResponse.json({ ...tx, mint: mint ?? MINT });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint") ?? MINT;
  const initialized = await perIsMintInitialized(mint);
  return NextResponse.json({ mint, initialized });
}
