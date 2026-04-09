// app/api/sol/transfer/route.ts
// Builds unsigned SOL transfer tx with privacy memo (nullifier on-chain)
// Returns base64 tx → wallet signs → sendRawTransaction → appears on Solscan

import { NextRequest, NextResponse } from "next/server";
import { buildTransferTransaction } from "@/lib/solana-tx";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createHash } from "crypto";

function randHex(n: number) {
  return Array.from({ length: n * 2 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet    = body.wallet ?? body.from;
    const toAddress = body.toAddress ?? body.to;
    const amountSol = body.amountSol ?? body.amount;

    if (!wallet)     return NextResponse.json({ error: "wallet required" }, { status: 400 });
    if (!toAddress)  return NextResponse.json({ error: "toAddress required" }, { status: 400 });
    if (!amountSol)  return NextResponse.json({ error: "amountSol required" }, { status: 400 });

    const lamports = Math.round(parseFloat(String(amountSol)) * LAMPORTS_PER_SOL);
    if (lamports < 1000) return NextResponse.json({ error: "Minimum transfer: 0.000001 SOL" }, { status: 400 });

    // Hash receiver address — keeps it private on-chain
    const nullifierHash  = randHex(16);
    const commitmentHash = createHash("sha256").update(`rcv:${toAddress}`).digest("hex").slice(0, 32);

    console.log(`[sol/transfer] from=${wallet.slice(0,8)}… to=${toAddress.slice(0,8)}… lamports=${lamports}`);
    const txData = await buildTransferTransaction(wallet, lamports, nullifierHash, commitmentHash);

    return NextResponse.json({
      transaction: txData.transaction,
      sendTo: "base" as const,
      nullifier:  `0x${nullifierHash}`,
      commitment: `0x${commitmentHash}`,
      vaultAddress: txData.vaultAddress,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[sol/transfer]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
