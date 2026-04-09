"use client";
import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ACTIONS = [
  { href:"/wallet",      icon:"🏦", title:"Private Wallet",  desc:"Deposit · Balance · Transfer · Withdraw",  btn:"Manage Wallet",  cls:"btn-green"   },
  { href:"/generate",    icon:"🔐", title:"Generate Proof",  desc:"Balance · Payment · Eligibility proofs",   btn:"Create Proof",   cls:"btn-primary" },
  { href:"/airdrop",     icon:"🪂", title:"Private Airdrop", desc:"Claim tokens without revealing wallet",     btn:"Claim Airdrop",  cls:"btn-orange"  },
  { href:"/verify/demo", icon:"✅", title:"Verify Proof",    desc:"Verify any proof ID — no data revealed",   btn:"Open Verifier",  cls:"btn-ghost"   },
];

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  useEffect(() => { if (!connected) router.push("/"); }, [connected, router]);
  if (!connected || !publicKey) return null;

  const addr = publicKey.toBase58();
  const short = addr.slice(0,6) + "…" + addr.slice(-6);

  return (
    <div className="relative min-h-screen">
      <div className="fixed pointer-events-none" style={{ top:"-20%", right:"10%", width:"500px", height:"500px", background:"radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)", filter:"blur(40px)" }} />

      <div className="relative max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10 anim-up">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Dashboard</p>
          <h1 className="text-4xl font-black text-white mb-2">Identity Hub</h1>
          <p className="text-slate-400">Your private Web3 identity layer — powered by MagicBlock PER.</p>
        </div>

        {/* Wallet card */}
        <div className="glass rounded-2xl p-5 border border-white/[0.07] mb-8 anim-up-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Connected Wallet</p>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/20 flex items-center justify-center">
              <span className="text-purple-300 text-lg">👛</span>
            </div>
            <div>
              <p className="font-mono text-sm text-white font-semibold">{short}</p>
              <p className="text-xs text-slate-500">Devnet · Phantom</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Connected</span>
            <span className="text-slate-600 text-xs ml-auto">StealthID v2</span>
          </div>
        </div>

        {/* Action grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {ACTIONS.map((a, i) => (
            <div key={a.href}
              className={"glass glass-hover rounded-2xl p-6 border border-white/[0.07] anim-up-" + (i+2)}>
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl shrink-0">{a.icon}</div>
                <div>
                  <h3 className="font-bold text-white text-base mb-1">{a.title}</h3>
                  <p className="text-slate-400 text-sm">{a.desc}</p>
                </div>
              </div>
              <Link href={a.href}
                className={"block w-full text-center font-semibold text-sm py-2.5 rounded-xl text-white " + a.cls}>
                {a.btn}
              </Link>
            </div>
          ))}
        </div>

        {/* Privacy note */}
        <div className="glass rounded-2xl p-5 border border-green-500/15 bg-green-500/5 anim-up-5">
          <div className="flex gap-3 items-start">
            <span className="text-2xl shrink-0">🔒</span>
            <div>
              <p className="font-semibold text-green-400 text-sm mb-1">Privacy Guarantee</p>
              <p className="text-slate-400 text-sm leading-relaxed">
                All private operations execute inside MagicBlock's Trusted Execution Environment (TEE).
                Balances, transfers, and identities are never exposed on-chain or in API responses — only cryptographic commitments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
