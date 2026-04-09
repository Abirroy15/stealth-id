// GET /api/sol/server-info — returns server wallet address + balance
// Used by UI to show fund instructions when withdraw fails
import { NextResponse } from "next/server";
import { getServerWalletAddress, getConnection } from "@/lib/solana-tx";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

export async function GET() {
  const address = getServerWalletAddress();
  try {
    const connection = getConnection();
    const bal = await connection.getBalance(new PublicKey(address));
    return NextResponse.json({
      address,
      balanceSol: bal / LAMPORTS_PER_SOL,
      balanceLamports: bal,
      funded: bal > 5_000_000, // > 0.005 SOL
      fundCommand: `solana airdrop 2 ${address} --url devnet`,
      faucetUrl: `https://faucet.solana.com/?address=${address}`,
    });
  } catch {
    return NextResponse.json({ address, funded: false, error: "Could not fetch balance" });
  }
}
