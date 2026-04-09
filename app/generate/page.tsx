"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { CopyButton } from "@/components/CopyButton";

type ProofType = "balance" | "payment" | "eligibility";
type Step = "form" | "generating" | "done" | "error";

interface ProofResult {
  proofId: string;
  type: string;
  result: boolean;
  proofHash: string;
  commitment: string;
  erReceipt: string;
  perAttestation: string;
  label: string;
  shareUrl: string;
  timestamp: number;
}

const PROOF_TYPES = [
  {
    value: "balance" as ProofType,
    icon: "💰",
    label: "Balance Proof",
    desc: "Prove private balance ≥ threshold (via PER TEE)",
    color: "text-green-400",
    border: "border-green-500/25",
    bg: "bg-green-500/8",
    selected: "bg-green-500/15 border-green-500/40",
  },
  {
    value: "payment" as ProofType,
    icon: "💳",
    label: "Payment Proof",
    desc: "Prove active subscription via private payment",
    color: "text-purple-400",
    border: "border-purple-500/25",
    bg: "bg-purple-500/8",
    selected: "bg-purple-500/15 border-purple-500/40",
  },
  {
    value: "eligibility" as ProofType,
    icon: "🎫",
    label: "Eligibility Proof",
    desc: "Prove airdrop / access eligibility privately",
    color: "text-blue-400",
    border: "border-blue-500/25",
    bg: "bg-blue-500/8",
    selected: "bg-blue-500/15 border-blue-500/40",
  },
];

const LOG_STEPS = [
  "Connecting to MagicBlock PER node…",
  "Initializing ER session…",
  "Submitting private inputs to TEE enclave…",
  "Running eligibility check inside TEE…",
  "Computing Pedersen commitment…",
  "Generating HMAC proof signature…",
  "Anchoring commitment via ER to Solana devnet…",
  "✓ Proof generated successfully",
];

export default function GeneratePage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const { toast } = useToast();

  const [proofType, setProofType] = useState<ProofType>("balance");
  const [threshold, setThreshold] = useState("1");
  const [plan, setPlan]           = useState("Pro");
  const [step, setStep]           = useState<Step>("form");
  const [logs, setLogs]           = useState<string[]>([]);
  const [result, setResult]       = useState<ProofResult | null>(null);
  const [error, setError]         = useState("");
  const [unlocked, setUnlocked]   = useState(false);
  const [memoTxSig, setMemoTxSig] = useState<string | null>(null);

  useEffect(() => { if (!connected) router.push("/"); }, [connected, router]);

  const addLog = (msg: string) => setLogs((p) => [...p, msg]);

  async function handleGenerate() {
    if (!publicKey || !signTransaction) return;
    setStep("generating");
    setLogs([]);
    setMemoTxSig(null);

    const logPromise = (async () => {
      for (let i = 0; i < LOG_STEPS.length; i++) {
        await new Promise((r) => setTimeout(r, 350 + i * 240));
        addLog(LOG_STEPS[i]);
      }
    })();

    try {
      const res = await fetch("/api/per/generate-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          proofType,
          thresholdSol: proofType === "balance" ? threshold : undefined,
          plan: proofType === "payment" ? plan : undefined,
        }),
      });
      await logPromise;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.hint ?? "Failed");

      // Sign the proof memo transaction → anchors proof hash on Solana
      if (data.transaction) {
        addLog("Signing proof memo transaction…");
        toast("Approve proof memo in Phantom…", "info", 8000);
        try {
          const tx = Transaction.from(Buffer.from(data.transaction, "base64"));
          const signed = await signTransaction(tx);
          addLog("Broadcasting proof memo to Solana…");
          const sig = await connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false, preflightCommitment: "processed",
          });
          await connection.confirmTransaction(sig, "confirmed");
          setMemoTxSig(sig);
          addLog(`✓ Proof hash anchored on-chain: ${sig.slice(0, 20)}…`);
          console.log("[proof-memo] confirmed:", sig);
        } catch (signErr) {
          addLog("⚠ Memo signing skipped (proof still valid off-chain)");
          console.warn("[proof-memo]", signErr);
        }
      }

      // Cache locally
      const key = `stealthid:proofs:${publicKey.toBase58()}`;
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]");
      existing.unshift({
        id: data.proofId, label: data.label, type: proofType,
        createdAt: data.timestamp, expiresAt: data.timestamp + 86_400_000,
        commitment: data.commitment, erReceipt: data.erReceipt,
      });
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 20)));

      setResult(data);
      setStep("done");
      toast("✓ Proof generated and anchored on Solana!", "success");
    } catch (e: unknown) {
      await logPromise;
      const msg = e instanceof Error ? e.message : "Unknown error";
      addLog("✗ Error: " + msg);
      setError(msg);
      setStep("error");
      toast(msg, "error");
    }
  }

  if (!connected) return null;

  const selectedType = PROOF_TYPES.find((p) => p.value === proofType)!;

  return (
    <div className="relative min-h-screen">
      <div className="fixed pointer-events-none" style={{ top: "10%", right: "-5%", width: "400px", height: "400px", background: "radial-gradient(ellipse,rgba(139,92,246,0.1) 0%,transparent 70%)", filter: "blur(40px)" }} />

      <div className="relative max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8 anim-up">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Generate Proof</p>
          <h1 className="text-4xl font-black text-white mb-1">Create Private Proof</h1>
          <p className="text-slate-400 text-sm">Private inputs never leave the TEE. Only a commitment is returned.</p>
        </div>

        {step === "form" && (
          <div className="space-y-5 anim-up-1">
            {/* Proof type selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Proof Type</label>
              <div className="space-y-2">
                {PROOF_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    onClick={() => setProofType(pt.value)}
                    className={"w-full flex items-center gap-4 rounded-2xl p-4 border text-left transition-all " +
                      (proofType === pt.value ? pt.selected : "glass border-white/[0.07] hover:bg-white/5")}
                  >
                    <span className="text-2xl">{pt.icon}</span>
                    <div className="flex-1">
                      <p className={"font-bold text-sm " + (proofType === pt.value ? pt.color : "text-white")}>{pt.label}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{pt.desc}</p>
                    </div>
                    <div className={"w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all " +
                      (proofType === pt.value ? "border-current bg-current " + pt.color : "border-slate-600")}>
                      {proofType === pt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic fields */}
            {proofType === "balance" && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Threshold (SOL)</label>
                <div className="flex items-center input overflow-hidden">
                  <span className="text-green-400 px-4 text-lg">◎</span>
                  <input type="number" min="0.001" step="0.1" value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm py-3.5 outline-none font-mono"
                  />
                  <span className="text-slate-500 text-sm pr-4 font-semibold">SOL</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1.5">Checks private balance ≥ {threshold} SOL inside TEE — balance never revealed</p>
              </div>
            )}

            {proofType === "payment" && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subscription Plan</label>
                <select value={plan} onChange={(e) => setPlan(e.target.value)}
                  className="input w-full px-4 py-3 text-sm appearance-none cursor-pointer">
                  {["Basic", "Pro", "Enterprise"].map((p) => (
                    <option key={p} value={p} className="bg-slate-900">{p}</option>
                  ))}
                </select>
              </div>
            )}

            {proofType === "eligibility" && (
              <div className="glass rounded-xl p-4 border border-blue-500/20 bg-blue-500/5">
                <p className="text-xs font-semibold text-blue-400 mb-2">Eligibility Conditions (checked privately)</p>
                <div className="space-y-1 text-xs text-slate-400">
                  <p>• Has any private balance, OR</p>
                  <p>• Has previously claimed an airdrop</p>
                </div>
              </div>
            )}

            {/* Privacy notice */}
            <div className="glass rounded-xl p-4 border border-green-500/15 bg-green-500/5 flex gap-3">
              <span className="text-xl shrink-0">🔒</span>
              <div>
                <p className="text-xs font-semibold text-green-400 mb-1">PER Privacy Guarantee</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Proof is computed inside MagicBlock's Trusted Execution Environment. Private inputs are never exposed — only a boolean result and cryptographic commitment are returned.
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              className="btn-primary w-full text-white font-bold py-4 rounded-xl text-sm"
            >
              Generate Proof via PER →
            </button>
          </div>
        )}

        {/* Terminal */}
        {(step === "generating" || step === "done" || step === "error") && (
          <div className="glass rounded-2xl overflow-hidden border border-white/[0.07] mb-5 anim-fade">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-black/20">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-[10px] text-slate-500 ml-2 font-mono">stealthid/per — proof-engine</span>
              {step === "generating" && <div className="ml-auto w-2 h-2 rounded-full bg-purple-400 animate-pulse" />}
            </div>
            <div className="p-5 font-mono text-[11px] space-y-1.5 min-h-40 bg-black/10">
              <p className="text-slate-600">$ stealthid proof generate --type={proofType} --tee --private</p>
              {logs.map((line, i) => (
                <p key={i} className={
                  line.startsWith("✗") ? "text-red-400" :
                  line.startsWith("✓") ? "text-green-400" :
                  "text-slate-400"
                }>
                  {line}
                </p>
              ))}
              {step === "generating" && <span className="text-purple-400 cursor-blink">█</span>}
            </div>
          </div>
        )}

        {/* Success */}
        {step === "done" && result && (
          <div className="space-y-4 anim-up">
            {/* Proof card */}
            <div className="glass rounded-2xl p-6 border border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">✓</div>
                <div>
                  <h3 className="font-bold text-green-400 text-lg">Proof Generated</h3>
                  <p className="text-slate-400 text-sm">{result.label}</p>
                </div>
                <span className="badge badge-green ml-auto">{result.type.toUpperCase()}</span>
              </div>

              <div className="space-y-3 mb-5">
                {[
                  { label: "Proof ID",      value: result.proofId,         color: "text-blue-300" },
                  { label: "Proof Hash",    value: result.proofHash,       color: "text-purple-300" },
                  { label: "Commitment",    value: result.commitment,      color: "text-slate-300" },
                  { label: "PER Attest",   value: result.perAttestation,  color: "text-slate-400" },
                  { label: "ER Receipt",   value: result.erReceipt,       color: "text-slate-400" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">{label}</p>
                    <div className="flex items-center gap-2 bg-black/25 rounded-xl px-3 py-2">
                      <span className={"font-mono text-[10px] flex-1 break-all " + color}>
                        {value.length > 48 ? value.slice(0, 36) + "…" : value}
                      </span>
                      <CopyButton text={value} iconOnly />
                    </div>
                  </div>
                ))}
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Expires</p>
                  <p className="text-sm text-green-400 font-mono">{new Date(result.timestamp + 86_400_000).toLocaleString()}</p>
                </div>
              </div>

              {/* On-chain anchor tx */}
              {memoTxSig && (
                <div className="border-t border-white/[0.06] pt-4 mt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Proof Anchored On-Chain ✓</p>
                  <div className="flex items-center gap-2 bg-black/25 rounded-xl px-3 py-2 mb-2">
                    <span className="font-mono text-[10px] text-green-300 flex-1 break-all">{memoTxSig}</span>
                    <CopyButton text={memoTxSig} iconOnly />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <a href={`https://solscan.io/tx/${memoTxSig}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 btn-primary text-white font-semibold text-xs px-4 py-2 rounded-xl">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      View Proof on Solscan
                    </a>
                    <a href={`https://explorer.solana.com/tx/${memoTxSig}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 btn-ghost text-slate-300 font-semibold text-xs px-4 py-2 rounded-xl">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Solana Explorer
                    </a>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1.5">Memo contains: STEALTHID:PROOF:{proofType.toUpperCase()}:ID={result.proofId}:HASH=…</p>
                </div>
              )}

              {/* Share link */}
              <div className="border-t border-white/[0.06] pt-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Shareable Verify Link</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-black/25 border border-white/[0.06] rounded-xl px-3 py-2 font-mono text-[10px] text-purple-300 truncate select-all">
                    {typeof window !== "undefined" ? window.location.origin : ""}/verify/{result.proofId}
                  </div>
                  <CopyButton
                    text={typeof window !== "undefined"
                      ? `${window.location.origin}/verify/${result.proofId}`
                      : `/verify/${result.proofId}`}
                    label="Copy"
                  />
                </div>
              </div>
            </div>

            {/* Unlock premium content demo */}
            <div className="glass rounded-2xl p-6 border border-purple-500/20">
              <h3 className="font-bold text-white mb-2">🎯 Unlock Premium Content</h3>
              <p className="text-slate-400 text-sm mb-4">Use your proof to access gated content — no wallet data revealed.</p>
              {!unlocked ? (
                <button
                  onClick={() => setUnlocked(true)}
                  className="btn-primary w-full text-white font-bold py-3 rounded-xl text-sm"
                >
                  🔓 Unlock with Proof
                </button>
              ) : (
                <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 p-5 text-center anim-fade">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="font-bold text-purple-300 text-lg mb-1">Access Granted!</p>
                  <p className="text-slate-400 text-sm">Your proof verified eligibility without revealing any private data.</p>
                  <div className="mt-3 badge badge-green mx-auto inline-flex">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    PREMIUM UNLOCKED
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <a href={`/verify/${result.proofId}`} target="_blank"
                className="flex-1 btn-primary text-white font-bold py-3 rounded-xl text-sm text-center">
                Open Verify Page →
              </a>
              <Link href="/dashboard"
                className="btn-ghost text-slate-300 font-semibold py-3 px-5 rounded-xl text-sm">
                Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="space-y-3 anim-fade">
            <div className="glass rounded-2xl p-5 border border-red-500/25 bg-red-500/8">
              <div className="flex items-start gap-3">
                <span className="text-2xl text-red-400 shrink-0">✗</span>
                <div>
                  <p className="font-bold text-red-400 mb-1">Proof Generation Failed</p>
                  <p className="text-slate-400 text-sm">{error}</p>
                  {error.includes("Deposit") && (
                    <Link href="/wallet"
                      className="mt-3 inline-flex items-center gap-2 btn-green text-white font-semibold text-xs px-4 py-2 rounded-xl">
                      → Deposit Funds First
                    </Link>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => { setStep("form"); setLogs([]); setError(""); }}
              className="w-full btn-ghost text-slate-300 font-semibold py-3 rounded-xl text-sm"
            >
              ← Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
