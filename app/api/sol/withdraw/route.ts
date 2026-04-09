// POST /api/sol/withdraw
// Server keypair sends real SOL to user wallet.
// Server auto-funds itself from devnet faucet on first use.
import { NextRequest, NextResponse } from "next/server";
import { serverWithdrawToUser, getServerWalletAddress } from "@/lib/solana-tx";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

function randHex(n: number) {
  return Array.from({ length: n * 2 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet    = body.wallet ?? body.owner;
    const amountSol = body.amountSol ?? body.amount;

    if (!wallet)    return NextResponse.json({ error: "wallet required" }, { status: 400 });
    if (!amountSol) return NextResponse.json({ error: "amountSol required" }, { status: 400 });

    const parsed = parseFloat(String(amountSol));
    if (isNaN(parsed) || parsed <= 0) {
      return NextResponse.json({ error: "amountSol must be a positive number" }, { status: 400 });
    }

    const lamports = Math.round(parsed * LAMPORTS_PER_SOL);
    const serverAddr = getServerWalletAddress();
    console.log(`[sol/withdraw] ${wallet.slice(0,8)}… wants ${parsed} SOL | server: ${serverAddr.slice(0,8)}…`);

    const { txSig } = await serverWithdrawToUser(wallet, lamports, randHex(16));
    const sentSol = Math.min(lamports, 100_000_000) / LAMPORTS_PER_SOL;

    return NextResponse.json({
      success: true,
      txSig,
      withdrawnSol: sentSol,
      serverWallet: serverAddr,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[sol/withdraw]", msg);
    return NextResponse.json({
      error: msg,
      hint: msg.includes("underfunded") || msg.includes("airdrop")
        ? `Fund the server wallet: solana airdrop 2 ${getServerWalletAddress()} --url devnet`
        : undefined,
    }, { status: 500 });
  }
}
