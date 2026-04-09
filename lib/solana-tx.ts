// lib/solana-tx.ts
// Real Solana transactions visible on Solscan.
// Withdraw/airdrop: server keypair signs. Server wallet is auto-funded from devnet.

import {
  Connection, PublicKey, SystemProgram, Transaction,
  Keypair, ComputeBudgetProgram, TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// ─── Config ───────────────────────────────────────────────────────────────────

export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

// Server wallet = same keypair used for withdrawals.
// Deposits flow INTO this address so withdrawals can spend them.
// Address: 339qNych3ZQmTTGLNctNuf7eHe5RP4vkvkgpUcpKsdNe
const SERVER_WALLET_SEED = "stealthid-svr-v2-devnet-keypair!";

// Legacy vault kept for reference only
export const VAULT_ADDRESS = new PublicKey(
  "SHLDv1wMFCvSBnMBEpjAhvDqEq9mHXA4Y6crFqnkJUL"
);

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

export const CLUSTER = "devnet";

export function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60_000,
  });
}

// ─── Server wallet (signs withdraw + airdrop) ─────────────────────────────────
// Deterministic keypair from fixed seed — same address every restart.
// Address: auto-printed on first use. Fund it once: solana airdrop 2 <address> --url devnet

declare global {
  // eslint-disable-next-line no-var
  var __stkp: Keypair | undefined;
  // eslint-disable-next-line no-var
  var __stbal: number;
}

function getServerKeypair(): Keypair {
  if (global.__stkp) return global.__stkp;
  const seed = Buffer.alloc(32, 0);
  seed.write(SERVER_WALLET_SEED);
  global.__stkp = Keypair.fromSeed(seed);
  global.__stbal = 0;
  console.log("[server-wallet] address:", global.__stkp.publicKey.toBase58());
  return global.__stkp;
}

/**
 * Ensure server wallet has enough SOL for a withdrawal.
 * Strategy:
 *   1. Check actual on-chain balance
 *   2. If < 0.3 SOL, requestAirdrop up to 2 SOL (devnet only)
 *   3. Retry once if airdrop fails
 *   4. Throw clearly if still underfunded
 */
async function ensureFunded(needed: number): Promise<void> {
  const connection = getConnection();
  const kp = getServerKeypair();

  const bal = await connection.getBalance(kp.publicKey);
  console.log(`[server-wallet] balance: ${bal / LAMPORTS_PER_SOL} SOL, need: ${needed / LAMPORTS_PER_SOL} SOL`);

  if (bal >= needed + 5_000) {
    // Plenty of SOL (5_000 lamports for fees)
    global.__stbal = bal;
    return;
  }

  // Need to top up — request 2 SOL airdrop
  console.log("[server-wallet] requesting devnet airdrop (2 SOL)…");
  try {
    const sig = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
    const newBal = await connection.getBalance(kp.publicKey);
    console.log(`[server-wallet] funded! new balance: ${newBal / LAMPORTS_PER_SOL} SOL`);
    global.__stbal = newBal;

    if (newBal < needed + 5_000) {
      throw new Error(`Server wallet underfunded after airdrop: ${newBal / LAMPORTS_PER_SOL} SOL`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Airdrop rate-limited? Check if we have any balance at all
    const retryBal = await connection.getBalance(kp.publicKey);
    if (retryBal >= needed + 5_000) {
      console.log("[server-wallet] airdrop may have succeeded, balance OK:", retryBal / LAMPORTS_PER_SOL);
      return;
    }
    throw new Error(
      `Server wallet has ${retryBal / LAMPORTS_PER_SOL} SOL, needs ${needed / LAMPORTS_PER_SOL} SOL. ` +
      `Airdrop failed: ${msg}. ` +
      `Run: solana airdrop 2 ${kp.publicKey.toBase58()} --url devnet`
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function memoIx(text: string, signer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(text.slice(0, 200), "utf8"),
  });
}

function priorityFee(): TransactionInstruction {
  return ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5_000 });
}

function toBase64(tx: Transaction): string {
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}

async function freshBlockhash(connection: Connection) {
  return connection.getLatestBlockhash("confirmed");
}

// ─── 1. DEPOSIT (user signs) ──────────────────────────────────────────────────

export async function buildDepositTransaction(
  fromWallet: string,
  amountLamports: number
): Promise<{ transaction: string; vaultAddress: string; amountLamports: number }> {
  const connection = getConnection();
  const from = new PublicKey(fromWallet);
  const serverKp = getServerKeypair();
  const { blockhash } = await freshBlockhash(connection);

  const tx = new Transaction();
  tx.add(priorityFee());
  // Deposit goes to server wallet — same account used for withdrawals
  tx.add(SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: serverKp.publicKey,   // ← server wallet, not dead vault
    lamports: amountLamports,
  }));
  tx.add(memoIx(`STEALTHID:DEPOSIT:${amountLamports}:${Date.now()}`, from));
  tx.recentBlockhash = blockhash;
  tx.feePayer = from;

  return {
    transaction: toBase64(tx),
    vaultAddress: serverKp.publicKey.toBase58(),
    amountLamports,
  };
}

// ─── 2. TRANSFER (user signs) ─────────────────────────────────────────────────

export async function buildTransferTransaction(
  fromWallet: string,
  amountLamports: number,
  nullifierHash: string,
  commitmentHash: string
): Promise<{ transaction: string; vaultAddress: string }> {
  const connection = getConnection();
  const from = new PublicKey(fromWallet);
  const serverKp = getServerKeypair();
  const { blockhash } = await freshBlockhash(connection);

  const tx = new Transaction();
  tx.add(priorityFee());
  // Transfer goes to server wallet (same pool as deposits)
  tx.add(SystemProgram.transfer({ fromPubkey: from, toPubkey: serverKp.publicKey, lamports: amountLamports }));
  tx.add(memoIx(`STEALTHID:TRANSFER:NULL=${nullifierHash.slice(0,16)}:CMT=${commitmentHash.slice(0,16)}`, from));
  tx.recentBlockhash = blockhash;
  tx.feePayer = from;

  return { transaction: toBase64(tx), vaultAddress: serverKp.publicKey.toBase58() };
}

// ─── 3. WITHDRAW (server signs, SOL → user) ───────────────────────────────────
// Server keypair sends real SOL to user. Auto-funds itself from devnet on first use.

export async function serverWithdrawToUser(
  toWallet: string,
  amountLamports: number,
  commitmentHash: string
): Promise<{ txSig: string }> {
  const connection = getConnection();
  const server = getServerKeypair();
  const to = new PublicKey(toWallet);

  // Cap at 0.1 SOL per call (demo safety)
  const sendAmount = Math.min(amountLamports, 100_000_000);

  // Auto-fund server wallet if needed
  await ensureFunded(sendAmount);

  const { blockhash, lastValidBlockHeight } = await freshBlockhash(connection);

  const tx = new Transaction();
  tx.add(priorityFee());
  tx.add(SystemProgram.transfer({ fromPubkey: server.publicKey, toPubkey: to, lamports: sendAmount }));
  tx.add(memoIx(`STEALTHID:WITHDRAW:CMT=${commitmentHash.slice(0,16)}`, server.publicKey));
  tx.recentBlockhash = blockhash;
  tx.feePayer = server.publicKey;
  tx.sign(server);

  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "processed",
    maxRetries: 3,
  });
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  console.log("[withdraw] ✓ confirmed:", sig, `(${sendAmount / LAMPORTS_PER_SOL} SOL → ${toWallet.slice(0,8)}…)`);
  return { txSig: sig };
}

// ─── 4. PROOF MEMO (user signs, zero SOL) ────────────────────────────────────

export async function buildProofMemoTransaction(
  wallet: string,
  proofId: string,
  proofHash: string,
  proofType: string
): Promise<{ transaction: string }> {
  const connection = getConnection();
  const payer = new PublicKey(wallet);
  const { blockhash } = await freshBlockhash(connection);

  const tx = new Transaction();
  tx.add(priorityFee());
  tx.add(memoIx(`STEALTHID:PROOF:${proofType.toUpperCase()}:ID=${proofId}:HASH=${proofHash.slice(0,20)}`, payer));
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;

  return { transaction: toBase64(tx) };
}

// ─── 5. AIRDROP CLAIM (server signs, SOL → user) ─────────────────────────────

export async function serverAirdropToUser(
  toWallet: string,
  amountLamports: number,
  claimHash: string
): Promise<{ txSig: string }> {
  const connection = getConnection();
  const server = getServerKeypair();
  const to = new PublicKey(toWallet);

  const sendAmount = Math.min(amountLamports, 50_000_000);
  await ensureFunded(sendAmount);

  const { blockhash, lastValidBlockHeight } = await freshBlockhash(connection);

  const tx = new Transaction();
  tx.add(priorityFee());
  tx.add(SystemProgram.transfer({ fromPubkey: server.publicKey, toPubkey: to, lamports: sendAmount }));
  tx.add(memoIx(`STEALTHID:AIRDROP:${claimHash.slice(0,16)}`, server.publicKey));
  tx.recentBlockhash = blockhash;
  tx.feePayer = server.publicKey;
  tx.sign(server);

  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, preflightCommitment: "processed", maxRetries: 3 });
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  console.log("[airdrop] ✓ confirmed:", sig);
  return { txSig: sig };
}

// ─── Explorer URLs ────────────────────────────────────────────────────────────
export const solscanUrl  = (sig: string) => `https://solscan.io/tx/${sig}?cluster=${CLUSTER}`;
export const explorerUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;

// ─── Server wallet info (for logging) ────────────────────────────────────────
export function getServerWalletAddress(): string {
  return getServerKeypair().publicKey.toBase58();
}
