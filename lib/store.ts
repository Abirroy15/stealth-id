// lib/store.ts
// In-memory proof store – replace with Redis/DB for production

export type ProofType = "balance" | "membership" | "payment";

export interface ProofRecord {
  id: string;
  type: ProofType;
  walletAddress: string; // hashed/committed – NOT raw
  proofHash: string;
  commitment: string;
  threshold?: number; // for balance proofs
  label?: string; // e.g. "Member of DAO XYZ"
  createdAt: number;
  expiresAt: number;
  verified: boolean;
  // MagicBlock ephemeral rollup receipt
  erReceipt?: string;
  // Solana tx signature (mock)
  solanaTxSig?: string;
}

// Global store (persists across API requests in dev)
declare global {
  // eslint-disable-next-line no-var
  var __proofStore: Map<string, ProofRecord> | undefined;
}

export const proofStore: Map<string, ProofRecord> =
  global.__proofStore ?? new Map();

if (!global.__proofStore) {
  global.__proofStore = proofStore;
}

export function saveProof(proof: ProofRecord): void {
  proofStore.set(proof.id, proof);
}

export function getProof(id: string): ProofRecord | undefined {
  return proofStore.get(id);
}

export function getAllProofsForWallet(walletHash: string): ProofRecord[] {
  return Array.from(proofStore.values()).filter(
    (p) => p.walletAddress === walletHash
  );
}
