// POST /api/per/withdraw
// Calls payments.magicblock.app/v1/spl/withdraw
// Returns unsigned base64 tx → frontend signs → sends to base Solana RPC
import { NextRequest, NextResponse } from "next/server";
import { perWithdraw, MINT, CLUSTER } from "@/lib/per";

export async function POST(req: NextRequest) {
  try {
    const { owner, amount } = await req.json();
    if (!owner || !amount) return NextResponse.json({ error: "owner and amount required" }, { status: 400 });
    if (typeof amount !== "number" || amount < 1)
      return NextResponse.json({ error: "amount must be a positive integer" }, { status: 400 });

    console.log(`[per/withdraw] owner=${owner.slice(0,8)}… amount=${amount}`);
    const tx = await perWithdraw(owner, amount);
    console.log(`[per/withdraw] kind=${tx.kind} sendTo=${tx.sendTo}`);

    return NextResponse.json({ ...tx, mint: MINT, cluster: CLUSTER });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[per/withdraw]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
