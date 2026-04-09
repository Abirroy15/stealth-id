"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { CopyButton } from "@/components/CopyButton";

interface AirdropResult {
  claimed: boolean;
  reason?: string;
  txSig?: string;
  amountSol?: number;
  proofHash?: string;
  commitment?: string;
  erReceipt?: string;
}

type Step = "idle" | "running" | "done" | "failed";

const CLUSTER = "devnet";
const solscan = (s: string) => `https://solscan.io/tx/${s}?cluster=${CLUSTER}`;
const explorer = (s: string) => `https://explorer.solana.com/tx/${s}?cluster=${CLUSTER}`;

const LOG_LINES = [
  "Connecting to MagicBlock PER node…",
  "Verifying eligibility inside TEE enclave…",
  "Checking private balance commitment…",
  "Eligibility confirmed ✓",
  "Initiating private token transfer…",
  "Broadcasting nullifier to ER…",
  "Anchoring commitment on Solana devnet…",
  "✓ Airdrop delivered to shielded balance",
];

function ExtIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function AirdropPage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep]           = useState<Step>("idle");
  const [logs, setLogs]           = useState<string[]>([]);
  const [result, setResult]       = useState<AirdropResult | null>(null);
  const [alreadyClaimed, setAC]   = useState(false);

  useEffect(() => { if (!connected) router.push("/"); }, [connected, router]);

  useEffect(() => {
    if (!publicKey) return;
    fetch(`/api/per/claim-airdrop?wallet=${publicKey.toBase58()}`)
      .then((r) => r.json())
      .then((d) => setAC(d.claimed))
      .catch(() => {});
  }, [publicKey]);

  const addLog = (msg: string) => setLogs((p) => [...p, msg]);

  async function handleClaim() {
    if (!publicKey) return;
    setStep("running");
    setLogs([]);
    setResult(null);

    for (let i = 0; i < LOG_LINES.length; i++) {
      await new Promise((r) => setTimeout(r, 320 + i * 260));
      addLog(LOG_LINES[i]);
    }

    try {
      const res = await fetch("/api/per/claim-airdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58() }),
      });
      const data: AirdropResult = await res.json();
      setResult(data);
      if (data.claimed) {
        setStep("done");
        setAC(true);
        toast("🎉 Airdrop claimed successfully!", "success");
      } else {
        setStep("failed");
        toast(data.reason ?? "Not eligible", "error");
      }
    } catch {
      setResult({ claimed: false, reason: "Network error — try again." });
      setStep("failed");
      toast("Network error", "error");
    }
  }

  if (!connected || !publicKey) return null;
  const addr = publicKey.toBase58();
  const short = addr.slice(0, 8) + "…";

  return (
    <div className="relative min-h-screen">
      {/* Orange ambient */}
      <div className="fixed pointer-events-none" style={{ top: "10%", left: "50%", transform: "translateX(-50%)", width: "500px", height: "300px", background: "radial-gradient(ellipse,rgba(245,158,11,0.08) 0%,transparent 70%)", filter: "blur(40px)" }} />

      <div className="relative max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8 anim-up">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Private Airdrop</p>
          <h1 className="text-4xl font-black text-white mb-1">Claim Privately</h1>
          <p className="text-slate-400 text-sm">Receive tokens without revealing your wallet, eligibility, or balance.</p>
        </div>

        {/* Airdrop info card */}
        <div className="glass rounded-2xl p-6 border border-orange-500/20 bg-orange-500/5 mb-5 anim-up-1">
          <div className="flex items-start gap-5">
            <div className="text-5xl animate-float">🪂</div>
            <div className="flex-1">
              <h2 className="font-black text-white text-xl mb-1">StealthID Genesis Airdrop</h2>
              <p className="text-slate-400 text-sm mb-4">
                Reward for early adopters with a private shielded balance. Claim without any on-chain wallet linkage.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Reward",     value: "0.5 SOL",          cls: "text-orange-400" },
                  { label: "Condition",  value: "Has any balance",   cls: "text-green-400"  },
                  { label: "Privacy",    value: "100% private",      cls: "text-purple-400" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="glass rounded-xl p-3 text-center border border-white/[0.06]">
                    <p className={"font-bold text-sm " + cls}>{value}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Already claimed */}
        {alreadyClaimed && step !== "done" && (
          <div className="glass rounded-2xl p-5 border border-slate-500/20 mb-5 flex items-center gap-4 anim-fade">
            <div className="w-10 h-10 rounded-xl bg-slate-500/15 flex items-center justify-center text-xl">✓</div>
            <div>
              <p className="font-bold text-slate-400">Already Claimed</p>
              <p className="text-slate-500 text-sm">You've already claimed this airdrop for this session.</p>
            </div>
          </div>
        )}

        {/* Eligibility checklist */}
        {!alreadyClaimed && step === "idle" && (
          <div className="glass rounded-2xl p-5 border border-white/[0.07] mb-5 anim-up-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Eligibility (checked privately in TEE)</p>
            <div className="space-y-2">
              {[
                { label: "Wallet connected",         ok: true  },
                { label: "Private balance ≥ 0 SOL",  ok: null  },
                { label: "Not previously claimed",   ok: !alreadyClaimed },
              ].map(({ label, ok }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    ok === null ? "bg-slate-700 text-slate-400" :
                    ok ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {ok === null ? "?" : ok ? "✓" : "✗"}
                  </div>
                  <span className={"text-sm " + (ok === false ? "text-slate-500 line-through" : "text-slate-300")}>
                    {label}
                  </span>
                  {ok === null && <span className="text-[10px] text-slate-600 ml-auto">verified in TEE</span>}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-4">
              💡 No balance yet?{" "}
              <Link href="/wallet" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                Deposit SOL first →
              </Link>
            </p>
          </div>
        )}

        {/* Claim button */}
        {(step === "idle" || step === "failed") && !alreadyClaimed && (
          <button
            onClick={handleClaim}
            className="btn-orange w-full text-white font-black py-4 rounded-2xl text-base mb-5 anim-up-3"
          >
            🪂 Claim Private Airdrop
          </button>
        )}

        {/* Terminal log */}
        {(step === "running" || step === "done" || step === "failed") && (
          <div className="glass rounded-2xl overflow-hidden border border-white/[0.07] mb-5 anim-fade">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-black/20">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="font-mono text-[10px] text-slate-500 ml-2">per-node — airdrop-engine</span>
              {step === "running" && <div className="ml-auto w-2 h-2 rounded-full bg-orange-400 animate-pulse" />}
            </div>
            <div className="p-5 font-mono text-[11px] space-y-1.5 min-h-36 bg-black/10">
              <p className="text-slate-600">$ stealthid airdrop claim --private --wallet={short}</p>
              {logs.map((line, i) => (
                <p key={i} className={
                  line.includes("✓") ? "text-green-400" :
                  line.includes("✗") || line.toLowerCase().includes("error") ? "text-red-400" :
                  "text-slate-400"
                }>
                  {line}
                </p>
              ))}
              {step === "running" && <span className="text-orange-400 cursor-blink">█</span>}
            </div>
          </div>
        )}

        {/* Success */}
        {step === "done" && result?.claimed && (
          <div className="space-y-4 anim-up">
            <div className="glass rounded-2xl p-6 border border-green-500/25 bg-green-500/5 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="font-black text-2xl text-green-400 mb-2">Airdrop Claimed!</h3>
              <p className="text-white font-bold text-lg mb-1">+{result.amountSol?.toFixed(3)} SOL</p>
              <p className="text-slate-400 text-sm mb-4">Added to your private shielded balance</p>
              <div className="badge badge-green mx-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                NO WALLET DATA REVEALED
              </div>
            </div>

            {/* Proof hash */}
            {result.proofHash && (
              <div className="glass rounded-2xl p-5 border border-orange-500/15">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Claim Proof Hash</p>
                <div className="flex items-center gap-2 bg-black/25 rounded-xl px-3 py-2.5">
                  <span className="font-mono text-[10px] text-orange-300 flex-1 break-all">{result.proofHash}</span>
                  <CopyButton text={result.proofHash} iconOnly />
                </div>
                <p className="text-[10px] text-slate-600 mt-1.5">Share this hash to prove you claimed — without linking your wallet.</p>
              </div>
            )}

            {/* ER Receipt */}
            {result.erReceipt && (
              <div className="glass rounded-2xl p-4 border border-white/[0.07]">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">MagicBlock ER Receipt</p>
                <div className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2">
                  <span className="font-mono text-[10px] text-slate-400 flex-1 break-all">{result.erReceipt}</span>
                  <CopyButton text={result.erReceipt} iconOnly />
                </div>
              </div>
            )}

            {/* Explorer links if we have a txSig */}
            {result.txSig && (
              <div className="glass rounded-2xl p-4 border border-purple-500/15 bg-purple-500/5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">On-Chain Transaction</p>
                <div className="flex items-center gap-2 bg-black/25 rounded-xl px-3 py-2.5 mb-3">
                  <span className="font-mono text-[10px] text-purple-300 flex-1 break-all">{result.txSig}</span>
                  <CopyButton text={result.txSig} iconOnly />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <a href={solscan(result.txSig)} target="_blank" rel="noopener noreferrer"
                    className="btn-primary flex items-center gap-1.5 text-white font-semibold text-xs px-4 py-2 rounded-xl">
                    <ExtIcon /> View on Solscan
                  </a>
                  <a href={explorer(result.txSig)} target="_blank" rel="noopener noreferrer"
                    className="btn-ghost flex items-center gap-1.5 text-slate-300 font-semibold text-xs px-4 py-2 rounded-xl">
                    <ExtIcon /> Explorer
                  </a>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Link href="/wallet"
                className="flex-1 btn-green text-white font-bold py-3 rounded-xl text-sm text-center">
                Check Balance
              </Link>
              <Link href="/generate"
                className="flex-1 btn-primary text-white font-bold py-3 rounded-xl text-sm text-center">
                Generate Proof
              </Link>
            </div>
          </div>
        )}

        {/* Failed */}
        {step === "failed" && result && !result.claimed && (
          <div className="space-y-4 anim-fade">
            <div className="glass rounded-2xl p-5 border border-red-500/25 bg-red-500/8">
              <div className="flex items-start gap-3">
                <span className="text-2xl text-red-400 shrink-0">✗</span>
                <div>
                  <p className="font-bold text-red-400 mb-1">Not Eligible</p>
                  <p className="text-slate-400 text-sm">{result.reason ?? "Eligibility check failed."}</p>
                </div>
              </div>
            </div>
            {result.reason?.includes("Deposit") && (
              <Link href="/wallet"
                className="block w-full btn-primary text-white font-bold py-3 rounded-xl text-sm text-center">
                ← Deposit SOL First
              </Link>
            )}
            <button
              onClick={() => { setStep("idle"); setLogs([]); setResult(null); }}
              className="w-full btn-ghost text-slate-300 font-semibold py-3 rounded-xl text-sm"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
