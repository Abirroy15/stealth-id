# StealthID – Private Web3 Identity Layer

> **Prove anything. Reveal nothing.**

A MagicBlock-powered privacy layer on Solana. Private SPL token payments, shielded SOL balances, ZK-like identity proofs, and private airdrops — all without exposing wallet data on-chain.

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local

# 3. Run
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

```env
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
PROOF_SECRET=stealthid-dev-secret-change-me-in-prod-32chars
```

---

## Project Structure

```
stealthid/
├── app/
│   ├── page.tsx                   Home / landing
│   ├── dashboard/page.tsx         Hub dashboard
│   ├── wallet/page.tsx            Private Payments (USDC + SOL)
│   ├── generate/page.tsx          Proof generation
│   ├── airdrop/page.tsx           Private airdrop claim
│   ├── verify/[id]/page.tsx       Public proof verification
│   └── api/
│       ├── per/                   MagicBlock PER API routes
│       │   ├── health/            GET  → payments.magicblock.app/health
│       │   ├── deposit/           POST → /v1/spl/deposit
│       │   ├── transfer/          POST → /v1/spl/transfer (private)
│       │   ├── withdraw/          POST → /v1/spl/withdraw
│       │   ├── private-balance/   GET  → /v1/spl/private-balance
│       │   ├── public-balance/    GET  → /v1/spl/balance
│       │   ├── initialize-mint/   POST → /v1/spl/initialize-mint
│       │   ├── generate-proof/    Proof generation + memo tx
│       │   ├── verify-proof/      Proof verification
│       │   └── claim-airdrop/     Airdrop claim
│       └── sol/                   Native SOL routes
│           ├── deposit/           User-signed SOL → server wallet
│           ├── transfer/          User-signed SOL with nullifier memo
│           └── withdraw/          Server-signed SOL → user wallet
│
├── lib/
│   ├── per.ts                     Real MagicBlock Private Payments API client
│   ├── solana-tx.ts               Solana transaction builders
│   ├── proofEngine.ts             HMAC proof generation / verification
│   ├── magicblock.ts              AI agent + eligibility checks
│   └── store.ts                   In-memory proof store
│
├── components/
│   ├── WalletProvider.tsx         Solana wallet adapter
│   ├── NavBar.tsx                 Navigation (hydration-safe)
│   ├── PerStatus.tsx              Live PER health badge
│   ├── Toast.tsx                  Toast notifications
│   ├── CopyButton.tsx             Copy + HashRow components
│   └── TxResult.tsx               Transaction result card
│
└── anchor/                        Solana smart contract (Anchor)
    └── programs/stealthid/
        └── src/lib.rs             ProofRegistry on-chain program
```

---

## Private Payments (USDC)

Uses the real **MagicBlock Private Payments API** at `payments.magicblock.app`.

| Operation | Endpoint | What happens |
|-----------|----------|--------------|
| Deposit   | `POST /v1/spl/deposit` | Solana ATA → ephemeral rollup, user signs |
| Transfer  | `POST /v1/spl/transfer` | Private SPL transfer, amount + receiver hidden |
| Withdraw  | `POST /v1/spl/withdraw` | Ephemeral → base chain, user signs |
| Balance   | `GET /v1/spl/balance` + `/private-balance` | Base + ephemeral balances |

**Token:** Devnet USDC — `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

**First use:** Go to Wallet → Init Mint tab and sign once to register USDC on the ephemeral rollup.

---

## Private Payments (SOL)

Native SOL using a server-controlled shielded pool.

| Operation | How it works |
|-----------|--------------|
| Deposit   | User signs tx → SOL → server wallet (shielded pool) |
| Transfer  | User signs tx with privacy memo → SOL → server wallet |
| Withdraw  | Server signs tx → SOL → user wallet (no Phantom needed) |
| Balance   | Reads directly from Solana devnet RPC |

**Server Wallet:** `339qNych3ZQmTTGLNctNuf7eHe5RP4vkvkgpUcpKsdNe`

The server wallet is funded by deposits. Deposit SOL first, then withdraw works automatically from the same pool.

---

## Proof System

Three proof types, all anchored on Solana via Memo transactions:

| Type | Proves | Hidden |
|------|--------|--------|
| Balance Proof | Wallet holds ≥ X USDC | Exact balance |
| Payment Proof | Active subscription | Payment details |
| Eligibility Proof | Access eligibility | Wallet identity |

**Flow:**
1. Backend generates proof hash (HMAC-signed commitment)
2. Returns unsigned Memo tx — user signs in Phantom
3. Proof hash anchored on Solana: `STEALTHID:PROOF:BALANCE:ID=xxx:HASH=0x...`
4. Share `/verify/[proofId]` — verifier sees only the claim, never private data

---

## On-Chain Transaction Architecture

Every action creates a real Solana transaction visible on Solscan/Explorer:

| Action | Signer | On-chain data |
|--------|--------|---------------|
| SOL Deposit | User (Phantom) | `STEALTHID:DEPOSIT:lamports:timestamp` |
| SOL Transfer | User (Phantom) | `STEALTHID:TRANSFER:NULL=...:CMT=...` |
| SOL Withdraw | Server wallet | `STEALTHID:WITHDRAW:CMT=...` |
| USDC Deposit | User (Phantom) | SPL token transfer to ephemeral rollup |
| USDC Transfer | User (Phantom) | Private SPL transfer (amount hidden) |
| USDC Withdraw | User (Phantom) | SPL token transfer from ephemeral rollup |
| Generate Proof | User (Phantom) | `STEALTHID:PROOF:TYPE:ID=...:HASH=...` |
| Claim Airdrop | Server wallet | `STEALTHID:AIRDROP:claimhash` |

---

## Anchor Smart Contract

Minimal on-chain program for proof commitment storage:

```rust
// Register proof commitment (hash only — no private data)
register_proof(proof_id, commitment, proof_type, label, wallet_hash, er_receipt, expires_at)

// Verify commitment on-chain
verify_proof(commitment_check) → VerificationResult { valid, expired, label }

// Revoke (owner only)
revoke_proof()
```

**Deploy:**
```bash
cd anchor
anchor build
anchor deploy --provider.cluster devnet
```

---

## Demo Flow

```
1. Connect Phantom wallet (devnet)
2. Wallet → USDC → Init Mint (once)
3. Wallet → USDC → Deposit 1,000,000 units (1 USDC)
4. Wallet → SOL → Deposit 0.1 SOL
5. Generate → Balance Proof ≥ 1 USDC → sign memo → proof anchored on Solana
6. Share /verify/[id] → verifier sees ✅ with Solscan link
7. Airdrop → Claim → SOL sent to wallet → visible on Solscan
8. Wallet → SOL → Withdraw 0.05 SOL → server sends back from pool
```



## License

MIT
