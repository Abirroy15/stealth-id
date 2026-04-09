// lib/per.ts
// REAL MagicBlock Private Payments API integration
// Base URL: https://payments.magicblock.app
// Docs:     https://payments.magicblock.app/reference
//
// The API works with SPL tokens (USDC by default).
// Every transaction endpoint returns an unsigned base64 transaction.
// The client signs it with Phantom and sends to the correct RPC:
//   sendTo = "base"      → Solana devnet RPC
//   sendTo = "ephemeral" → MagicBlock ephemeral RPC

const PER_BASE = "https://payments.magicblock.app";

// Devnet USDC mint (official MagicBlock devnet token)
export const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
// Mainnet USDC mint
export const MAINNET_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// MagicBlock ephemeral RPC endpoint (devnet)
export const EPHEMERAL_DEVNET_RPC = "https://devnet.magicblock.app";
// Solana devnet base RPC
export const BASE_DEVNET_RPC = "https://api.devnet.solana.com";

// Which cluster to use
export const CLUSTER = (process.env.NEXT_PUBLIC_CLUSTER as "devnet" | "mainnet") ?? "devnet";
export const MINT = CLUSTER === "mainnet" ? MAINNET_USDC_MINT : DEVNET_USDC_MINT;

// ─── Shared response type (all tx-building endpoints) ────────────────────────

export interface PerTxResponse {
  kind: "deposit" | "withdraw" | "transfer";
  version: "legacy";
  transactionBase64: string;      // unsigned tx → wallet signs this
  sendTo: "base" | "ephemeral";   // which RPC to broadcast to after signing
  recentBlockhash: string;
  lastValidBlockHeight: number;
  instructionCount: number;
  requiredSigners: string[];
  validator?: string;
}

// ─── 1. Health ────────────────────────────────────────────────────────────────
// GET /health → { status: "ok" }

export interface PerHealthResponse {
  online: boolean;
  status: string;
  latency: number;
  apiBase: string;
  cluster: string;
  mint: string;
}

export async function perHealth(): Promise<PerHealthResponse> {
  const t0 = Date.now();
  try {
    const r = await fetch(`${PER_BASE}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json();
    return {
      online: r.ok && data.status === "ok",
      status: data.status ?? "unknown",
      latency: Date.now() - t0,
      apiBase: PER_BASE,
      cluster: CLUSTER,
      mint: MINT,
    };
  } catch {
    return { online: false, status: "error", latency: Date.now() - t0, apiBase: PER_BASE, cluster: CLUSTER, mint: MINT };
  }
}

// ─── 2. Deposit ───────────────────────────────────────────────────────────────
// POST /v1/spl/deposit
// Builds unsigned tx: user's Solana ATA → ephemeral rollup vault
// User signs → sends to base Solana RPC → tx visible on Solscan

export async function perDeposit(owner: string, amount: number): Promise<PerTxResponse> {
  const r = await fetch(`${PER_BASE}/v1/spl/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner,
      amount,                      // in token base units (USDC = 6 decimals, so 1 USDC = 1000000)
      cluster: CLUSTER,
      initIfMissing: true,
      initVaultIfMissing: true,
      initAtasIfMissing: true,
      idempotent: true,
    }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `Deposit failed: ${r.status}`);
  }
  return r.json();
}

// ─── 3. Transfer ─────────────────────────────────────────────────────────────
// POST /v1/spl/transfer
// Builds unsigned private SPL transfer tx
// visibility: "private" = amount + receiver hidden from chain
// User signs → sends to ephemeral RPC (sendTo = "ephemeral")

export async function perTransfer(
  from: string,
  to: string,
  amount: number,
  memo?: string
): Promise<PerTxResponse> {
  const r = await fetch(`${PER_BASE}/v1/spl/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      mint: MINT,
      amount,
      visibility: "private",       // hides amount + receiver on-chain
      fromBalance: "ephemeral",    // from ephemeral rollup balance
      toBalance: "ephemeral",      // to ephemeral rollup balance
      cluster: CLUSTER,
      initIfMissing: true,
      initAtasIfMissing: true,
      initVaultIfMissing: true,
      memo: memo ?? "StealthID private transfer",
      minDelayMs: "0",
      maxDelayMs: "0",
      split: 1,
    }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `Transfer failed: ${r.status}`);
  }
  return r.json();
}

// ─── 4. Withdraw ─────────────────────────────────────────────────────────────
// POST /v1/spl/withdraw
// Builds unsigned tx: ephemeral vault → user's Solana ATA
// User signs → sends to base Solana RPC → tx visible on Solscan

export async function perWithdraw(owner: string, amount: number): Promise<PerTxResponse> {
  const r = await fetch(`${PER_BASE}/v1/spl/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner,
      mint: MINT,
      amount,
      cluster: CLUSTER,
      idempotent: true,
    }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `Withdraw failed: ${r.status}`);
  }
  return r.json();
}

// ─── 5. Initialize Mint ───────────────────────────────────────────────────────
// POST /v1/spl/initialize-mint
// Sets up validator-scoped transfer queue for a mint on the ephemeral RPC
// Only needs to be done once per mint per validator

export async function perInitializeMint(owner: string, mint?: string): Promise<PerTxResponse> {
  const r = await fetch(`${PER_BASE}/v1/spl/initialize-mint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner,
      mint: mint ?? MINT,
      cluster: CLUSTER,
    }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `Initialize mint failed: ${r.status}`);
  }
  return r.json();
}

// ─── 6. Balance (base chain) ─────────────────────────────────────────────────
// GET /v1/spl/balance?address=...&mint=...&cluster=...

export interface PerBalanceResponse {
  address: string;
  mint: string;
  ata: string;
  location: "base" | "ephemeral";
  balance: string;   // raw token units as string
}

export async function perBalance(address: string): Promise<PerBalanceResponse> {
  const params = new URLSearchParams({ address, mint: MINT, cluster: CLUSTER });
  const r = await fetch(`${PER_BASE}/v1/spl/balance?${params}`);
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `Balance failed: ${r.status}`);
  }
  return r.json();
}

// ─── 7. Private Balance (ephemeral rollup) ────────────────────────────────────
// GET /v1/spl/private-balance?address=...&mint=...&cluster=...

export async function perPrivateBalance(address: string): Promise<PerBalanceResponse> {
  const params = new URLSearchParams({ address, mint: MINT, cluster: CLUSTER });
  const r = await fetch(`${PER_BASE}/v1/spl/private-balance?${params}`);
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `Private balance failed: ${r.status}`);
  }
  return r.json();
}

// ─── 8. Is Mint Initialized ──────────────────────────────────────────────────
// GET /v1/spl/is-mint-initialized?mint=...&cluster=...

export async function perIsMintInitialized(mint?: string): Promise<boolean> {
  const params = new URLSearchParams({ mint: mint ?? MINT, cluster: CLUSTER });
  const r = await fetch(`${PER_BASE}/v1/spl/is-mint-initialized?${params}`);
  if (!r.ok) return false;
  const d = await r.json();
  return d.initialized === true;
}

// ─── RPC helper ──────────────────────────────────────────────────────────────
// Given a PerTxResponse, returns the correct RPC to broadcast to after signing

export function getRpcForTx(tx: PerTxResponse): string {
  return tx.sendTo === "ephemeral" ? EPHEMERAL_DEVNET_RPC : BASE_DEVNET_RPC;
}
