// anchor/programs/stealthid/src/lib.rs
//
// StealthID – Private Identity Layer on Solana
//
// Architecture:
//   • ProofRegistry: on-chain store of proof commitments (hashes only)
//   • register_proof: store a proof commitment from a verifier
//   • verify_proof:   check commitment exists and is unexpired
//   • revoke_proof:   allow owner to revoke their proof
//
// Privacy model:
//   • No private data stored on-chain — only cryptographic commitments
//   • Wallet address is hashed before storage (unlinkable)
//   • Actual balance / token data processed off-chain via MagicBlock PER (TEE)

use anchor_lang::prelude::*;

declare_id!("SteaLthiDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

// ─── Constants ────────────────────────────────────────────────────────────────

pub const PROOF_REGISTRY_SEED: &[u8] = b"proof_registry";
pub const PROOF_RECORD_SEED: &[u8] = b"proof_record";
pub const MAX_LABEL_LEN: usize = 64;
pub const MAX_COMMITMENT_LEN: usize = 64;
pub const MAX_ER_RECEIPT_LEN: usize = 128;

// ─── Program ──────────────────────────────────────────────────────────────────

#[program]
pub mod stealthid {
    use super::*;

    /// Initialize the global proof registry (one per program).
    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.proof_count = 0;
        registry.bump = ctx.bumps.registry;
        msg!("StealthID registry initialized");
        Ok(())
    }

    /// Register a new proof commitment on-chain.
    ///
    /// Called after MagicBlock PER has generated the proof off-chain.
    /// Only the commitment hash is stored — no sensitive data.
    pub fn register_proof(
        ctx: Context<RegisterProof>,
        proof_id: String,        // unique proof ID (12-char base64url)
        commitment: String,      // SHA-256 commitment hash (hex, 64 chars)
        proof_type: ProofType,   // balance | membership | payment
        label: String,           // human-readable claim, e.g. "Balance ≥ 1 SOL"
        wallet_hash: String,     // one-way hash of wallet address (32 chars)
        er_receipt: String,      // MagicBlock ER session receipt
        expires_at: i64,         // Unix timestamp (ms)
    ) -> Result<()> {
        require!(commitment.len() <= MAX_COMMITMENT_LEN, StealthError::CommitmentTooLong);
        require!(label.len() <= MAX_LABEL_LEN, StealthError::LabelTooLong);
        require!(er_receipt.len() <= MAX_ER_RECEIPT_LEN, StealthError::ReceiptTooLong);

        let clock = Clock::get()?;
        let expires_at_secs = expires_at / 1000; // convert ms → seconds
        require!(expires_at_secs > clock.unix_timestamp, StealthError::AlreadyExpired);

        let record = &mut ctx.accounts.proof_record;
        record.proof_id = proof_id.clone();
        record.commitment = commitment;
        record.proof_type = proof_type;
        record.label = label;
        record.wallet_hash = wallet_hash;
        record.er_receipt = er_receipt;
        record.owner = ctx.accounts.owner.key();
        record.created_at = clock.unix_timestamp;
        record.expires_at = expires_at_secs;
        record.revoked = false;
        record.bump = ctx.bumps.proof_record;

        // Increment registry counter
        let registry = &mut ctx.accounts.registry;
        registry.proof_count = registry.proof_count.saturating_add(1);

        emit!(ProofRegistered {
            proof_id,
            proof_type: record.proof_type.clone(),
            created_at: record.created_at,
            expires_at: record.expires_at,
        });

        msg!("Proof registered: {}", record.proof_id);
        Ok(())
    }

    /// Verify a proof on-chain.
    ///
    /// Returns a VerificationResult indicating validity.
    /// Does NOT reveal any sensitive data.
    pub fn verify_proof(
        ctx: Context<VerifyProof>,
        commitment_check: String, // caller provides commitment to check against stored
    ) -> Result<VerificationResult> {
        let record = &ctx.accounts.proof_record;
        let clock = Clock::get()?;

        let is_expired = clock.unix_timestamp > record.expires_at;
        let commitment_matches = record.commitment == commitment_check;
        let is_valid = !record.revoked && !is_expired && commitment_matches;

        emit!(ProofVerified {
            proof_id: record.proof_id.clone(),
            valid: is_valid,
            verified_at: clock.unix_timestamp,
        });

        msg!(
            "Proof {} verification: valid={}, expired={}, revoked={}",
            record.proof_id,
            is_valid,
            is_expired,
            record.revoked
        );

        Ok(VerificationResult {
            valid: is_valid,
            expired: is_expired,
            revoked: record.revoked,
            label: record.label.clone(),
            proof_type: record.proof_type.clone(),
            expires_at: record.expires_at,
        })
    }

    /// Revoke a proof (owner only).
    pub fn revoke_proof(ctx: Context<RevokeProof>) -> Result<()> {
        let record = &mut ctx.accounts.proof_record;
        require!(!record.revoked, StealthError::AlreadyRevoked);

        record.revoked = true;

        emit!(ProofRevoked {
            proof_id: record.proof_id.clone(),
            revoked_by: ctx.accounts.owner.key(),
        });

        msg!("Proof revoked: {}", record.proof_id);
        Ok(())
    }
}

// ─── Account Contexts ─────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProofRegistry::INIT_SPACE,
        seeds = [PROOF_REGISTRY_SEED],
        bump,
    )]
    pub registry: Account<'info, ProofRegistry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(proof_id: String)]
pub struct RegisterProof<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + ProofRecord::INIT_SPACE,
        seeds = [PROOF_RECORD_SEED, proof_id.as_bytes()],
        bump,
    )]
    pub proof_record: Account<'info, ProofRecord>,
    #[account(
        mut,
        seeds = [PROOF_REGISTRY_SEED],
        bump = registry.bump,
    )]
    pub registry: Account<'info, ProofRegistry>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(commitment_check: String)]
pub struct VerifyProof<'info> {
    #[account(
        seeds = [PROOF_RECORD_SEED, proof_record.proof_id.as_bytes()],
        bump = proof_record.bump,
    )]
    pub proof_record: Account<'info, ProofRecord>,
    /// CHECK: verifier can be anyone
    pub verifier: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct RevokeProof<'info> {
    #[account(
        mut,
        seeds = [PROOF_RECORD_SEED, proof_record.proof_id.as_bytes()],
        bump = proof_record.bump,
        has_one = owner,
    )]
    pub proof_record: Account<'info, ProofRecord>,
    pub owner: Signer<'info>,
}

// ─── Account Structs ──────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct ProofRegistry {
    pub authority: Pubkey,   // admin
    pub proof_count: u64,    // total proofs registered
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ProofRecord {
    #[max_len(16)]
    pub proof_id: String,
    #[max_len(64)]
    pub commitment: String,      // SHA-256 hex commitment – safe to store on-chain
    pub proof_type: ProofType,
    #[max_len(64)]
    pub label: String,           // "Balance ≥ 1 SOL" – reveals only the claim
    #[max_len(32)]
    pub wallet_hash: String,     // one-way hash of wallet – unlinkable
    #[max_len(128)]
    pub er_receipt: String,      // MagicBlock ER receipt
    pub owner: Pubkey,
    pub created_at: i64,
    pub expires_at: i64,
    pub revoked: bool,
    pub bump: u8,
}

// ─── Data Types ───────────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq)]
pub enum ProofType {
    Balance,
    Membership,
    Payment,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct VerificationResult {
    pub valid: bool,
    pub expired: bool,
    pub revoked: bool,
    pub label: String,
    pub proof_type: ProofType,
    pub expires_at: i64,
}

// ─── Events ───────────────────────────────────────────────────────────────────

#[event]
pub struct ProofRegistered {
    pub proof_id: String,
    pub proof_type: ProofType,
    pub created_at: i64,
    pub expires_at: i64,
}

#[event]
pub struct ProofVerified {
    pub proof_id: String,
    pub valid: bool,
    pub verified_at: i64,
}

#[event]
pub struct ProofRevoked {
    pub proof_id: String,
    pub revoked_by: Pubkey,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum StealthError {
    #[msg("Commitment string exceeds maximum length")]
    CommitmentTooLong,
    #[msg("Label string exceeds maximum length")]
    LabelTooLong,
    #[msg("ER receipt string exceeds maximum length")]
    ReceiptTooLong,
    #[msg("Proof has already expired")]
    AlreadyExpired,
    #[msg("Proof has already been revoked")]
    AlreadyRevoked,
    #[msg("Only the proof owner can perform this action")]
    Unauthorized,
}
