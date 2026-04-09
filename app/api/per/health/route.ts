// GET /api/per/health → proxies https://payments.magicblock.app/health
import { NextResponse } from "next/server";
import { perHealth } from "@/lib/per";

export async function GET() {
  try {
    const health = await perHealth();
    return NextResponse.json(health);
  } catch {
    return NextResponse.json({ online: false, status: "error", error: "PER unreachable" }, { status: 503 });
  }
}
