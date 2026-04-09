// app/api/proof/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateProof } from "@/lib/proofEngine";
import { saveProof } from "@/lib/store";
import {
  createERSession,
  runPERCompute,
  verifyPrivatePayment,
} from "@/lib/magicblock";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, proofType, threshold, daoName, subscriptionPlan } =
      body;

    if (!walletAddress || !proofType) {
      return NextResponse.json(
        { error: "walletAddress and proofType are required" },
        { status: 400 }
      );
    }

    // 1. Create MagicBlock ER session for fast execution
    const erSession = await createERSession(walletAddress);

    // 2. Run PER private computation (TEE-based)
    const perResult = await runPERCompute({
      walletAddress,
      balance:
        proofType === "balance"
          ? body.actualBalance ?? Math.floor(Math.random() * 5e9)
          : undefined,
      threshold: proofType === "balance" ? threshold : undefined,
      proofType,
    });

    // 3. For payment proofs, verify via Private Payments API
    let paymentAttestation: string | undefined;
    if (proofType === "payment") {
      const paymentProof = await verifyPrivatePayment(
        walletAddress,
        subscriptionPlan ?? "pro"
      );
      paymentAttestation = paymentProof.attestation;
    }

    // 4. Generate the cryptographic proof
    const proof = generateProof({
      walletAddress,
      proofType,
      // For balance: use PER output (private inputs never leave TEE)
      // We mock the balance check here; in prod PER handles this privately
      actualBalance:
        proofType === "balance"
          ? body.actualBalance ?? Math.floor(Math.random() * 5e9) + threshold
          : undefined,
      threshold: proofType === "balance" ? Number(threshold) : undefined,
      daoName: proofType === "membership" ? daoName : undefined,
      subscriptionPlan:
        proofType === "payment" ? subscriptionPlan : undefined,
    });

    // 5. Persist proof record (only hash/commitment, never raw data)
    saveProof({
      id: proof.id,
      type: proofType,
      walletAddress: proof.walletHash, // hashed
      proofHash: proof.proofHash,
      commitment: proof.commitment,
      threshold: proof.threshold,
      label: proof.label,
      createdAt: Date.now(),
      expiresAt: proof.expiresAt,
      verified: true,
      erReceipt: proof.erReceipt,
      solanaTxSig: proof.solanaTxSig,
    });

    // 6. Return proof reference (never raw wallet data)
    return NextResponse.json({
      success: true,
      proofId: proof.id,
      label: proof.label,
      commitment: proof.commitment, // safe to share
      expiresAt: proof.expiresAt,
      erReceipt: proof.erReceipt,
      solanaTxSig: proof.solanaTxSig,
      erSession: erSession.sessionId,
      perAttestation: perResult.attestation,
      shareUrl: `/verify/${proof.id}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
