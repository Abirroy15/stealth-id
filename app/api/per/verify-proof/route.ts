import { NextRequest, NextResponse } from "next/server";
import { getProof } from "@/lib/store";
import { runAccessAgent } from "@/lib/magicblock";

export async function GET(req: NextRequest) {
  const proofId = req.nextUrl.searchParams.get("proofId");
  if (!proofId) return NextResponse.json({ error: "proofId required" }, { status: 400 });

  const record = getProof(proofId);
  if (!record) return NextResponse.json({ valid: false, error: "Proof not found" }, { status: 404 });

  const expired = Date.now() > record.expiresAt;
  const valid = record.verified && !expired;
  const agent = runAccessAgent(record.type, record.label ?? "");

  return NextResponse.json({
    valid,
    expired,
    proofId,
    type: record.type,
    label: record.label,
    commitment: record.commitment,
    erReceipt: record.erReceipt,
    agentDecision: agent,
  });
}
