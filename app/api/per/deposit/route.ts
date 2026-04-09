// POST /api/per/deposit
// Calls payments.magicblock.app/v1/spl/deposit → returns unsigned base64 tx
// Frontend signs with Phantom → sends to Solana → appears on Solscan
import { NextRequest, NextResponse } from "next/server";
import { perDeposit, MINT, CLUSTER } from "@/lib/per";

export async function POST(req: NextRequest) {
  try {
    const { owner, amount } = await req.json();
    if (!owner || !amount) return NextResponse.json({ error: "owner and amount required" }, { status: 400 });
    if (typeof amount !== "number" || amount < 1)
      return NextResponse.json({ error: "amount must be a positive integer (token base units)" }, { status: 400 });

    console.log(`[per/deposit] owner=${owner.slice(0,8)}… amount=${amount} cluster=${CLUSTER}`);
    const tx = await perDeposit(owner, amount);
    console.log(`[per/deposit] tx.kind=${tx.kind} sendTo=${tx.sendTo} instructions=${tx.instructionCount}`);

    return NextResponse.json({
      ...tx,
      // Include helpful metadata
      mint: MINT,
      cluster: CLUSTER,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[per/deposit]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
