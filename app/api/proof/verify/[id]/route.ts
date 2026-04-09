// app/api/proof/verify/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getProof } from "@/lib/store";
import { verifyProof } from "@/lib/proofEngine";
import { runAccessAgent } from "@/lib/magicblock";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const record = getProof(id);

  if (!record) {
    return NextResponse.json({ error: "Proof not found" }, { status: 404 });
  }

  const result = verifyProof(
    id,
    record.commitment,
    record.proofHash,
    record.expiresAt,
    record.erReceipt ?? "",
    record.solanaTxSig ?? "",
    record.label ?? "",
    record.type,
    record.createdAt
  );

  // Run AI agent decision
  const agentDecision = runAccessAgent(record.type, record.label ?? "");

  return NextResponse.json({
    proofId: id,
    ...result,
    agentDecision,
    // Show only commitment & receipt – never wallet address or balance
    commitment: record.commitment,
    erReceipt: record.erReceipt,
    solanaTxSig: record.solanaTxSig,
    threshold: record.threshold,
  });
}
