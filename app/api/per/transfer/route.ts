// POST /api/per/transfer
// Calls payments.magicblock.app/v1/spl/transfer (visibility: private)
// Returns unsigned base64 tx → frontend signs → sends to ephemeral or base RPC
import { NextRequest, NextResponse } from "next/server";
import { perTransfer, MINT, CLUSTER } from "@/lib/per";

export async function POST(req: NextRequest) {
  try {
    const { from, to, amount, memo } = await req.json();
    if (!from || !to || !amount)
      return NextResponse.json({ error: "from, to, and amount required" }, { status: 400 });
    if (typeof amount !== "number" || amount < 1)
      return NextResponse.json({ error: "amount must be a positive integer" }, { status: 400 });

    console.log(`[per/transfer] from=${from.slice(0,8)}… to=${to.slice(0,8)}… amount=${amount}`);
    const tx = await perTransfer(from, to, amount, memo);
    console.log(`[per/transfer] kind=${tx.kind} sendTo=${tx.sendTo}`);

    return NextResponse.json({ ...tx, mint: MINT, cluster: CLUSTER });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[per/transfer]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
