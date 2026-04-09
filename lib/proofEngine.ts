// lib/proofEngine.ts
// Simulates Zero-Knowledge Proof generation.
// In production: replace with real zk-SNARKs (Groth16 / Plonk) or MagicBlock PER.

import { createHash, createHmac, randomBytes } from "crypto";

const PROOF_SECRET = process.env.PROOF_SECRET ?? "stealthid-dev-secret-32chars!!";
const PROOF_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProofInput {
  walletAddress: string;
  proofType: "balance" | "membership" | "payment";
  // Balance proof
  actualBalance?: number; // lamports – NEVER stored
  threshold?: number; // lamports
  // Membership proof
  tokenMint?: string;
  daoName?: string;
  // Payment proof
  subscriptionPlan?: string;
}

export interface GeneratedProof {
  id: string;
  proofHash: string;
  commitment: string;
  walletHash: string; // one-way hash of wallet address
  erReceipt: string; // MagicBlock ER receipt (mock)
  solanaTxSig: string; // mock Solana tx sig
  expiresAt: number;
  label: string;
  threshold?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmacSign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

function randomHex(bytes = 16): string {
  return randomBytes(bytes).toString("hex");
}

// Deterministic wallet hash – one-way, unlinkable without preimage
function hashWallet(address: string): string {
  return sha256(`wallet:${address}:${PROOF_SECRET}`).slice(0, 32);
}

// ─── Proof Generation ─────────────────────────────────────────────────────────

export function generateProofId(): string {
  // URL-safe 12-char ID
  return randomBytes(9).toString("base64url");
}

/**
 * Simulate MagicBlock Private Ephemeral Rollup (PER) computation.
 * In production this would:
 *  1. Submit private inputs to PER
 *  2. PER runs inside TEE / verifiable compute
 *  3. Returns a ZK proof receipt
 */
function simulatePERCompute(input: ProofInput, nonce: string): string {
  const payload = JSON.stringify({
    type: input.proofType,
    walletHash: hashWallet(input.walletAddress),
    nonce,
    ts: Date.now(),
  });
  return `PER:${hmacSign(payload, PROOF_SECRET).slice(0, 32)}`;
}

/**
 * Simulate MagicBlock Ephemeral Rollup (ER) fast execution receipt.
 */
function simulateERReceipt(proofId: string): string {
  const slot = Math.floor(Math.random() * 1_000_000) + 300_000_000;
  return `ER:slot${slot}:${randomHex(8)}`;
}

/**
 * Mock Solana transaction signature (base58-like).
 */
function mockSolanaTxSig(): string {
  return randomBytes(64).toString("base64url").slice(0, 87) + "=";
}

// ─── Main Generate Function ───────────────────────────────────────────────────

export function generateProof(input: ProofInput): GeneratedProof {
  const id = generateProofId();
  const nonce = randomHex(16);
  const walletHash = hashWallet(input.walletAddress);
  const expiresAt = Date.now() + PROOF_TTL_MS;

  let proofClaim: string;
  let label: string;

  switch (input.proofType) {
    case "balance": {
      const threshold = input.threshold ?? 0;
      const actualBalance = input.actualBalance ?? 0;
      const qualifies = actualBalance >= threshold;

      // Commit to the CLAIM, not the value
      // claim = "balance >= threshold" → boolean, no leakage
      proofClaim = `balance_gte:${threshold}:${qualifies}`;
      label = `Balance ≥ ${(threshold / 1e9).toFixed(2)} SOL`;

      if (!qualifies) {
        throw new Error(
          `Balance insufficient: wallet does not meet threshold of ${threshold} lamports`
        );
      }
      break;
    }

    case "membership": {
      proofClaim = `membership:${input.daoName ?? "DAO"}:true`;
      label = `Member of ${input.daoName ?? "DAO"}`;
      break;
    }

    case "payment": {
      proofClaim = `subscription:${input.subscriptionPlan ?? "pro"}:active`;
      label = `Active ${input.subscriptionPlan ?? "Pro"} Subscription`;
      break;
    }
  }

  // Pedersen-like commitment: H(claim || nonce || walletHash)
  const commitment = sha256(`${proofClaim}:${nonce}:${walletHash}`);

  // Proof hash: HMAC-signed commitment → verifiable by server
  const proofHash = hmacSign(`${id}:${commitment}:${expiresAt}`, PROOF_SECRET);

  // MagicBlock PER simulation
  const perOutput = simulatePERCompute(input, nonce);
  const erReceipt = simulateERReceipt(id);
  const solanaTxSig = mockSolanaTxSig();

  return {
    id,
    proofHash,
    commitment,
    walletHash,
    erReceipt: `${erReceipt}:${perOutput}`,
    solanaTxSig,
    expiresAt,
    label,
    threshold: input.threshold,
  };
}

// ─── Proof Verification ───────────────────────────────────────────────────────

export interface VerifyResult {
  valid: boolean;
  expired: boolean;
  label: string;
  proofType: string;
  createdAt: number;
  expiresAt: number;
  erReceipt: string;
  solanaTxSig: string;
  // What we reveal: the claim, not the data
  claim: string;
}

export function verifyProof(
  id: string,
  commitment: string,
  proofHash: string,
  expiresAt: number,
  erReceipt: string,
  solanaTxSig: string,
  label: string,
  proofType: string,
  createdAt: number
): VerifyResult {
  const now = Date.now();
  const expired = now > expiresAt;

  // Recompute expected hash
  const expectedHash = hmacSign(
    `${id}:${commitment}:${expiresAt}`,
    PROOF_SECRET
  );
  const valid = !expired && expectedHash === proofHash;

  return {
    valid,
    expired,
    label,
    proofType,
    createdAt,
    expiresAt,
    erReceipt,
    solanaTxSig,
    claim: label,
  };
}
