"use client";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const CARDS = [
  { icon: "🔒", title: "Private Balance",  desc: "Deposit SOL into MagicBlock's shielded pool. Your balance is encrypted inside a TEE.", color: "from-purple-500/20 to-purple-600/5", border: "border-purple-500/20" },
  { icon: "↔",  title: "Private Transfer", desc: "Send funds without revealing sender, receiver, or amount — only a nullifier returned.",  color: "from-blue-500/20 to-blue-600/5",   border: "border-blue-500/20"   },
  { icon: "✅", title: "ZK-like Proofs",   desc: "Prove wallet properties (balance ≥ X, membership, payment) without exposing data.",       color: "from-green-500/20 to-green-600/5", border: "border-green-500/20"  },
  { icon: "🪂", title: "Private Airdrop",  desc: "Claim tokens without linking your wallet to eligibility. Fully private on-chain.",         color: "from-orange-500/20 to-orange-600/5", border: "border-orange-500/20" },
];

export default function HomePage() {
  const { connected } = useWallet();
  return (
    <div className="relative min-h-screen">
      <div className="fixed pointer-events-none" style={{ top:"-10%", left:"50%", transform:"translateX(-50%)", width:"600px", height:"600px", background:"radial-gradient(ellipse, rgba(109,40,217,0.15) 0%, transparent 70%)", filter:"blur(40px)" }} />
      <div className="fixed pointer-events-none" style={{ top:"40%", right:"-5%", width:"400px", height:"400px", background:"radial-gradient(ellipse, rgba(59,130,246,0.1) 0%, transparent 70%)", filter:"blur(30px)" }} />

      <div className="relative max-w-5xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-20">
          <div className="mb-5 anim-up">
            <span className="badge badge-purple">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              POWERED BY MAGICBLOCK PER · SOLANA DEVNET
            </span>
          </div>

          <h1 className="font-black leading-[1.05] mb-6 anim-up-1" style={{ fontSize: "clamp(3rem,7vw,5rem)" }}>
            <span className="text-white block">Prove Anything.</span>
            <span className="gradient-text text-glow-purple block">Reveal Nothing.</span>
          </h1>

          <p className="text-slate-400 text-lg max-w-md mx-auto mb-10 leading-relaxed anim-up-2">
            Private identity and payments powered by MagicBlock PER.
            Shielded balances, ZK-like proofs, private airdrops — all on Solana.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 anim-up-3">
            {connected ? (
              <Link href="/dashboard" className="btn-primary text-white font-bold px-10 py-4 rounded-xl text-base">
                Open Dashboard →
              </Link>
            ) : (
              <div className="scale-110" suppressHydrationWarning><WalletMultiButton /></div>
            )}
            <Link href="/verify/demo" className="btn-ghost text-slate-300 font-semibold px-8 py-4 rounded-xl text-sm">
              View Demo Proof ↗
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16">
          {CARDS.map((c, i) => (
            <div key={c.title}
              className={"glass glass-hover rounded-2xl p-6 border " + c.border + " bg-gradient-to-br " + c.color + " anim-up-" + (i+2)}>
              <div className="text-3xl mb-3">{c.icon}</div>
              <h3 className="font-bold text-white text-base mb-2">{c.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Demo flow */}
        <div className="glass rounded-2xl p-8">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-6 text-center">Demo Flow</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { n:"01", t:"Connect",  d:"Link Phantom wallet" },
              { n:"02", t:"Deposit",  d:"Sign real on-chain tx" },
              { n:"03", t:"Generate", d:"Prove privately via PER" },
              { n:"04", t:"Claim",    d:"Airdrop without exposure" },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
                  <span className="font-bold text-xs text-purple-400">{s.n}</span>
                </div>
                <p className="font-semibold text-white text-sm mb-1">{s.t}</p>
                <p className="text-slate-500 text-xs">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
