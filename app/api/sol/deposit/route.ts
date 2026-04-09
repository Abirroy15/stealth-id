// app/api/sol/deposit/route.ts
// Builds real unsigned Solana tx (user → StealthID vault)
// Returns base64 tx → wallet signs → sendRawTransaction → appears on Solscan

import { NextRequest, NextResponse } from "next/server";
import { buildDepositTransaction } from "@/lib/solana-tx";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet    = body.wallet ?? body.owner;
    const amountSol = body.amountSol ?? body.amount;

    if (!wallet)     return NextResponse.json({ error: "wallet required" }, { status: 400 });
    if (!amountSol)  return NextResponse.json({ error: "amountSol required" }, { status: 400 });

    const lamports = Math.round(parseFloat(String(amountSol)) * LAMPORTS_PER_SOL);
    if (lamports < 1000) return NextResponse.json({ error: "Minimum deposit: 0.000001 SOL" }, { status: 400 });

    console.log(`[sol/deposit] wallet=${wallet.slice(0,8)}… lamports=${lamports}`);
    const txData = await buildDepositTransaction(wallet, lamports);

    return NextResponse.json({
      // Use "transaction" key (SOL native) — wallet page uses signAndSendSol
      transaction: txData.transaction,
      sendTo: "base" as const,
      vaultAddress: txData.vaultAddress,
      amountSol: parseFloat(String(amountSol)),
      amountLamports: lamports,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[sol/deposit]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
