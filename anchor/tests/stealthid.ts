// anchor/tests/stealthid.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Stealthid } from "../target/types/stealthid";
import { assert } from "chai";

describe("stealthid", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Stealthid as Program<Stealthid>;
  const authority = provider.wallet.publicKey;

  let registryPda: anchor.web3.PublicKey;
  let registryBump: number;
  const proofId = "testproof01";
  let proofRecordPda: anchor.web3.PublicKey;

  before(async () => {
    [registryPda, registryBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("proof_registry")],
      program.programId
    );
    [proofRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("proof_record"), Buffer.from(proofId)],
      program.programId
    );
  });

  it("Initializes the registry", async () => {
    await program.methods
      .initializeRegistry()
      .accounts({
        registry: registryPda,
        authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const registry = await program.account.proofRegistry.fetch(registryPda);
    assert.equal(registry.authority.toBase58(), authority.toBase58());
    assert.equal(registry.proofCount.toNumber(), 0);
    console.log("✓ Registry initialized");
  });

  it("Registers a balance proof", async () => {
    const commitment = "a3f7c2d1e4b5a890123456789012345678901234567890abcdef1234567890ab";
    const expiresAt = (Date.now() + 86_400_000); // 24h from now

    await program.methods
      .registerProof(
        proofId,
        commitment,
        { balance: {} },
        "Balance ≥ 1.00 SOL",
        "wallethashabcdef1234567890abcdef",
        "ER:slot312847293:4f8a2c1b",
        new anchor.BN(expiresAt)
      )
      .accounts({
        proofRecord: proofRecordPda,
        registry: registryPda,
        owner: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const record = await program.account.proofRecord.fetch(proofRecordPda);
    assert.equal(record.proofId, proofId);
    assert.equal(record.commitment, commitment);
    assert.equal(record.label, "Balance ≥ 1.00 SOL");
    assert.isFalse(record.revoked);

    const registry = await program.account.proofRegistry.fetch(registryPda);
    assert.equal(registry.proofCount.toNumber(), 1);
    console.log("✓ Proof registered, commitment:", commitment.slice(0, 16) + "…");
  });

  it("Verifies the proof with correct commitment", async () => {
    const commitment = "a3f7c2d1e4b5a890123456789012345678901234567890abcdef1234567890ab";

    const result = await program.methods
      .verifyProof(commitment)
      .accounts({
        proofRecord: proofRecordPda,
        verifier: authority,
      })
      .view();

    assert.isTrue(result.valid);
    assert.isFalse(result.expired);
    assert.isFalse(result.revoked);
    assert.equal(result.label, "Balance ≥ 1.00 SOL");
    console.log("✓ Proof verified: valid =", result.valid);
  });

  it("Rejects incorrect commitment", async () => {
    const wrongCommitment = "0000000000000000000000000000000000000000000000000000000000000000";

    const result = await program.methods
      .verifyProof(wrongCommitment)
      .accounts({
        proofRecord: proofRecordPda,
        verifier: authority,
      })
      .view();

    assert.isFalse(result.valid);
    console.log("✓ Wrong commitment correctly rejected");
  });

  it("Revokes proof (owner only)", async () => {
    await program.methods
      .revokeProof()
      .accounts({
        proofRecord: proofRecordPda,
        owner: authority,
      })
      .rpc();

    const record = await program.account.proofRecord.fetch(proofRecordPda);
    assert.isTrue(record.revoked);
    console.log("✓ Proof revoked");
  });

  it("Revoked proof fails verification", async () => {
    const commitment = "a3f7c2d1e4b5a890123456789012345678901234567890abcdef1234567890ab";

    const result = await program.methods
      .verifyProof(commitment)
      .accounts({
        proofRecord: proofRecordPda,
        verifier: authority,
      })
      .view();

    assert.isFalse(result.valid);
    assert.isTrue(result.revoked);
    console.log("✓ Revoked proof correctly returns invalid");
  });
});
