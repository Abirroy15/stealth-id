"use client";
import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Connection, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { CopyButton } from "@/components/CopyButton";

const BASE_RPC      = "https://api.devnet.solana.com";
const EPHEMERAL_RPC = "https://devnet.magicblock.app";
const CLUSTER       = "devnet";
const DEVNET_USDC   = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const solscan       = (s: string) => `https://solscan.io/tx/${s}?cluster=${CLUSTER}`;
const explorer      = (s: string) => `https://explorer.solana.com/tx/${s}?cluster=${CLUSTER}`;

function getConn(sendTo: "base" | "ephemeral"): Connection {
  return new Connection(sendTo === "ephemeral" ? EPHEMERAL_RPC : BASE_RPC, "confirmed");
}

type Token = "usdc" | "sol";
type Tab   = "deposit" | "balance" | "transfer" | "withdraw";
type Phase = "idle" | "building" | "signing" | "sending" | "confirming" | "done" | "error";

const PHASE_LABELS: Record<string, string> = {
  building:   "Building transaction…",
  signing:    "Approve in Phantom…",
  sending:    "Broadcasting to Solana…",
  confirming: "Confirming on-chain…",
};

const TABS: { id: Tab; icon: string; label: string; ac: string }[] = [
  { id: "deposit",  icon: "↓", label: "Deposit",  ac: "bg-green-500/15 text-green-300 border border-green-500/25"   },
  { id: "balance",  icon: "◈", label: "Balance",  ac: "bg-purple-500/15 text-purple-300 border border-purple-500/25" },
  { id: "transfer", icon: "↔", label: "Transfer", ac: "bg-blue-500/15 text-blue-300 border border-blue-500/25"       },
  { id: "withdraw", icon: "↑", label: "Withdraw", ac: "bg-orange-500/15 text-orange-300 border border-orange-500/25" },
];

interface TxResult { txSig: string; sendTo: "base" | "ephemeral"; label: string; }
interface UsdcBal  { baseBal: string; privBal: string; ata: string; }
interface SolBal   { lamports: number; sol: number; }

function ExtIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function HR({ label, value, color = "text-purple-300" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">{label}</p>
      <div className="flex items-center gap-2 bg-black/25 rounded-xl px-3 py-2">
        <span className={"font-mono text-[10px] flex-1 break-all " + color}>{value.length > 48 ? value.slice(0,36)+"…" : value}</span>
        <CopyButton text={value} iconOnly />
      </div>
    </div>
  );
}
function ErrCard({ msg }: { msg: string }) {
  return (
    <div className="glass rounded-2xl p-5 border border-red-500/25 bg-red-500/10 anim-fade">
      <div className="flex items-start gap-3">
        <span className="text-red-400 text-xl shrink-0">✗</span>
        <div><p className="font-bold text-red-400 text-sm mb-1">Error</p><p className="text-slate-400 text-sm">{msg}</p></div>
      </div>
    </div>
  );
}
function TxCard({ r }: { r: TxResult }) {
  return (
    <div className="glass rounded-2xl p-5 border border-green-500/20 bg-green-500/5 anim-fade space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center text-lg">✓</div>
        <div>
          <p className="font-bold text-green-400">{r.label}</p>
          <p className="text-slate-400 text-xs">{r.sendTo === "ephemeral" ? "MagicBlock Ephemeral RPC" : "Solana Devnet"}</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Transaction Signature</p>
        <div className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-2.5 border border-white/[0.06] mb-3">
          <span className="font-mono text-[10px] text-purple-300 flex-1 break-all">{r.txSig}</span>
          <CopyButton text={r.txSig} iconOnly />
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={solscan(r.txSig)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 btn-primary text-white font-semibold text-xs px-4 py-2.5 rounded-xl"><ExtIcon/>Solscan</a>
          <a href={explorer(r.txSig)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 btn-ghost text-slate-300 font-semibold text-xs px-4 py-2.5 rounded-xl"><ExtIcon/>Explorer</a>
          <CopyButton text={r.txSig} label="Copy Sig" />
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection: walletConn } = useConnection();
  const router = useRouter();
  const { toast } = useToast();

  const [token,   setToken]   = useState<Token>("usdc");
  const [tab,     setTab]     = useState<Tab>("deposit");
  const [amount,  setAmount]  = useState("");
  const [toAddr,  setToAddr]  = useState("");
  const [phase,   setPhase]   = useState<Phase>("idle");
  const [errMsg,  setErrMsg]  = useState("");
  const [txRes,   setTxRes]   = useState<TxResult | null>(null);
  const [usdcBal, setUsdcBal] = useState<UsdcBal | null>(null);
  const [solBal,  setSolBal]  = useState<SolBal | null>(null);
  const [balLoad, setBalLoad] = useState(false);

  useEffect(() => { if (!connected) router.push("/"); }, [connected, router]);

  const busy  = ["building","signing","sending","confirming"].includes(phase);
  const reset = useCallback(() => { setPhase("idle"); setErrMsg(""); setTxRes(null); }, []);
  const switchTab   = (t: Tab)   => { setTab(t); reset(); };
  const switchToken = (t: Token) => {
    setToken(t); reset();
    setUsdcBal(null); setSolBal(null);
    setAmount(t === "usdc" ? "1000000" : "0.1");
  };

  /* ── sign + send (PER base64 tx) ──────────────────────────────────────── */
  const signAndSend = useCallback(async (
    buildFn: () => Promise<{ transactionBase64: string; sendTo: "base" | "ephemeral"; [k: string]: unknown }>,
    label: string
  ): Promise<TxResult> => {
    if (!publicKey || !signTransaction) throw new Error("Wallet not connected");

    setPhase("building");
    const data = await buildFn();

    setPhase("signing");
    const tx = Transaction.from(Buffer.from(data.transactionBase64, "base64"));
    let signed: Transaction;
    try { signed = await signTransaction(tx); }
    catch { throw new Error("Rejected in Phantom"); }

    setPhase("sending");
    const conn = getConn(data.sendTo as "base" | "ephemeral");
    const sig = await conn.sendRawTransaction(signed.serialize(), { skipPreflight: false, preflightCommitment: "processed" });

    setPhase("confirming");
    await conn.confirmTransaction(sig, "confirmed");

    setPhase("done");
    toast(`✓ ${label} confirmed!`, "success");
    return { txSig: sig, sendTo: data.sendTo as "base" | "ephemeral", label };
  }, [publicKey, signTransaction, toast]);

  /* ── sign + send (native SOL base64 tx) ──────────────────────────────── */
  const signAndSendSol = useCallback(async (
    buildFn: () => Promise<{ transaction: string; [k: string]: unknown }>,
    label: string
  ): Promise<TxResult> => {
    if (!publicKey || !signTransaction) throw new Error("Wallet not connected");

    setPhase("building");
    const data = await buildFn();

    setPhase("signing");
    const tx = Transaction.from(Buffer.from(data.transaction, "base64"));
    let signed: Transaction;
    try { signed = await signTransaction(tx); }
    catch { throw new Error("Rejected in Phantom"); }

    setPhase("sending");
    const sig = await walletConn.sendRawTransaction(signed.serialize(), { skipPreflight: false, preflightCommitment: "processed" });

    setPhase("confirming");
    await walletConn.confirmTransaction(sig, "confirmed");

    setPhase("done");
    toast(`✓ ${label} confirmed!`, "success");
    return { txSig: sig, sendTo: "base", label };
  }, [publicKey, signTransaction, walletConn, toast]);

  /* ── USDC actions ─────────────────────────────────────────────────────── */
  const handleUsdcDeposit = useCallback(async () => {
    reset();
    try {
      const r = await signAndSend(() =>
        fetch("/api/per/deposit", { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ owner: publicKey!.toBase58(), amount: parseInt(amount||"1000000") }) })
        .then(async r => { const d=await r.json(); if(!r.ok) throw new Error(d.error); return d; }),
        "USDC Deposit");
      setTxRes(r);
    } catch (e: unknown) { const m=e instanceof Error?e.message:"Unknown"; setPhase("error"); setErrMsg(m); toast(m,"error"); }
  }, [publicKey, amount, reset, signAndSend, toast]);

  const handleUsdcTransfer = useCallback(async () => {
    reset();
    try {
      const r = await signAndSend(() =>
        fetch("/api/per/transfer", { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ from: publicKey!.toBase58(), to: toAddr, amount: parseInt(amount||"1000000"), memo:"Private transfer" }) })
        .then(async r => { const d=await r.json(); if(!r.ok) throw new Error(d.error); return d; }),
        "USDC Transfer");
      setTxRes(r);
    } catch (e: unknown) { const m=e instanceof Error?e.message:"Unknown"; setPhase("error"); setErrMsg(m); toast(m,"error"); }
  }, [publicKey, amount, toAddr, reset, signAndSend, toast]);

  const handleUsdcWithdraw = useCallback(async () => {
    reset();
    try {
      const r = await signAndSend(() =>
        fetch("/api/per/withdraw", { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ owner: publicKey!.toBase58(), amount: parseInt(amount||"1000000") }) })
        .then(async r => { const d=await r.json(); if(!r.ok) throw new Error(d.error); return d; }),
        "USDC Withdraw");
      setTxRes(r);
    } catch (e: unknown) { const m=e instanceof Error?e.message:"Unknown"; setPhase("error"); setErrMsg(m); toast(m,"error"); }
  }, [publicKey, amount, reset, signAndSend, toast]);

  const handleUsdcBalance = useCallback(async () => {
    if (!publicKey) return;
    setUsdcBal(null); setBalLoad(true);
    try {
      const [base, priv] = await Promise.allSettled([
        fetch(`/api/per/public-balance?address=${publicKey.toBase58()}`).then(r=>r.json()),
        fetch(`/api/per/private-balance?address=${publicKey.toBase58()}`).then(r=>r.json()),
      ]);
      const baseBal = base.status==="fulfilled" && !base.value.error ? base.value.balance ?? "0" : "0";
      const privBal = priv.status==="fulfilled" && !priv.value.error ? priv.value.balance ?? "0" : "0";
      const ata     = base.status==="fulfilled" && !base.value.error ? base.value.ata ?? "" : "";
      setUsdcBal({ baseBal, privBal, ata });
    } catch { toast("Balance fetch failed","error"); }
    finally { setBalLoad(false); }
  }, [publicKey, toast]);

  /* ── SOL actions ──────────────────────────────────────────────────────── */
  const handleSolDeposit = useCallback(async () => {
    reset();
    try {
      const r = await signAndSendSol(() =>
        fetch("/api/sol/deposit", { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ wallet: publicKey!.toBase58(), amountSol: parseFloat(amount||"0.1") }) })
        .then(async r => { const d=await r.json(); if(!r.ok) throw new Error(d.error); return d; }),
        "SOL Deposit");
      setTxRes(r);
    } catch (e: unknown) { const m=e instanceof Error?e.message:"Unknown"; setPhase("error"); setErrMsg(m); toast(m,"error"); }
  }, [publicKey, amount, reset, signAndSendSol, toast]);

  const handleSolTransfer = useCallback(async () => {
    reset();
    try {
      const r = await signAndSendSol(() =>
        fetch("/api/sol/transfer", { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ wallet: publicKey!.toBase58(), toAddress: toAddr, amountSol: parseFloat(amount||"0.1") }) })
        .then(async r => { const d=await r.json(); if(!r.ok) throw new Error(d.error); return d; }),
        "SOL Transfer");
      setTxRes(r);
    } catch (e: unknown) { const m=e instanceof Error?e.message:"Unknown"; setPhase("error"); setErrMsg(m); toast(m,"error"); }
  }, [publicKey, amount, toAddr, reset, signAndSendSol, toast]);

  const handleSolWithdraw = useCallback(async () => {
    reset();
    setPhase("sending");
    try {
      const r = await fetch("/api/sol/withdraw", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ wallet: publicKey!.toBase58(), amountSol: parseFloat(amount||"0.1") }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Withdraw failed");
      setPhase("done");
      setTxRes({ txSig: d.txSig, sendTo: "base", label: `SOL Withdraw · ${d.withdrawnSol?.toFixed(4)} SOL` });
      toast("✓ SOL withdrawal confirmed!", "success");
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "Unknown";
      setPhase("error"); setErrMsg(m); toast(m, "error");
    }
  }, [publicKey, amount, reset, toast]);

  const handleSolBalance = useCallback(async () => {
    if (!publicKey) return;
    setSolBal(null); setBalLoad(true);
    try {
      const lamports = await walletConn.getBalance(publicKey);
      setSolBal({ lamports, sol: lamports / LAMPORTS_PER_SOL });
    } catch { toast("Balance fetch failed","error"); }
    finally { setBalLoad(false); }
  }, [publicKey, walletConn, toast]);

  /* ── dispatchers ──────────────────────────────────────────────────────── */
  const onDeposit  = token === "usdc" ? handleUsdcDeposit  : handleSolDeposit;
  const onTransfer = token === "usdc" ? handleUsdcTransfer : handleSolTransfer;
  const onWithdraw = token === "usdc" ? handleUsdcWithdraw : handleSolWithdraw;
  const onBalance  = token === "usdc" ? handleUsdcBalance  : handleSolBalance;

  if (!connected) return null;

  const isUsdc    = token === "usdc";
  const amtUnit   = isUsdc ? "USDC units" : "SOL";
  const amtSymbol = isUsdc ? "$" : "◎";
  const amtHint   = isUsdc ? "1 USDC = 1,000,000 base units" : "Enter amount in SOL (e.g. 0.1)";

  return (
    <div className="relative min-h-screen">
      <div className="fixed pointer-events-none" style={{top:"20%",left:"-5%",width:"400px",height:"400px",background:"radial-gradient(ellipse,rgba(16,185,129,0.07) 0%,transparent 70%)",filter:"blur(40px)"}}/>
      <div className="relative max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-8 anim-up">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Wallet</p>
          <h1 className="text-4xl font-black text-white mb-0">Private Payments</h1>
        </div>

        {/* Token selector */}
        <div className="flex gap-3 mb-5 anim-up-1">
          <button onClick={() => switchToken("usdc")}
            className={"flex-1 flex items-center gap-3 rounded-2xl p-4 border transition-all " +
              (isUsdc ? "border-blue-500/40 bg-blue-500/10" : "glass border-white/[0.07] hover:bg-white/5")}>
            <div className={"w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 " +
              (isUsdc ? "bg-blue-500 text-white" : "bg-white/10 text-slate-400")}>$</div>
            <div className="text-left">
              <p className={"font-bold text-sm " + (isUsdc ? "text-white" : "text-slate-400")}>USDC</p>
              <p className="text-[10px] text-slate-500">SPL Token · Devnet</p>
            </div>
            {isUsdc && <div className="ml-auto w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
          </button>

          <button onClick={() => switchToken("sol")}
            className={"flex-1 flex items-center gap-3 rounded-2xl p-4 border transition-all " +
              (!isUsdc ? "border-purple-500/40 bg-purple-500/10" : "glass border-white/[0.07] hover:bg-white/5")}>
            <div className={"w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 " +
              (!isUsdc ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white" : "bg-white/10 text-slate-400")}>◎</div>
            <div className="text-left">
              <p className={"font-bold text-sm " + (!isUsdc ? "text-white" : "text-slate-400")}>SOL</p>
              <p className="text-[10px] text-slate-500">Native · Devnet</p>
            </div>
            {!isUsdc && <div className="ml-auto w-2 h-2 rounded-full bg-purple-400 animate-pulse" />}
          </button>
        </div>

        {/* Token info strip */}
        <div className={"glass rounded-xl px-4 py-2.5 mb-5 border flex items-center gap-3 anim-up-1 " +
          (isUsdc ? "border-blue-500/15" : "border-purple-500/15")}>
          <span className={"text-lg " + (isUsdc ? "text-blue-400" : "text-purple-400")}>{isUsdc ? "$" : "◎"}</span>
          <p className="font-mono text-[10px] text-slate-500 truncate flex-1">
            {isUsdc ? `Mint: ${DEVNET_USDC}` : "Native Solana · Shielded via MagicBlock PER"}
          </p>
          <span className={"badge text-[9px] " + (isUsdc ? "badge-blue" : "badge-purple")}>{isUsdc ? "USDC" : "SOL"}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 glass rounded-2xl p-1.5 mb-5 anim-up-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => switchTab(t.id)}
              className={"flex-1 flex items-center justify-center gap-1.5 font-semibold text-xs py-2.5 rounded-xl transition-all " +
                (tab === t.id ? t.ac : "text-slate-500 hover:text-slate-300 hover:bg-white/5")}>
              <span>{t.icon}</span><span className="hidden sm:block">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Phase indicator (no toast — inline only) */}
        {busy && (
          <div className="flex items-center gap-3 mb-4 glass rounded-xl px-4 py-3 border border-purple-500/20 anim-fade">
            <div className="spinner shrink-0" />
            <p className="text-sm text-white font-medium">{PHASE_LABELS[phase]}</p>
          </div>
        )}

        {/* ── DEPOSIT ── */}
        {tab === "deposit" && (
          <div className="space-y-4 anim-fade">
            <div className="glass rounded-2xl p-6 border border-green-500/15">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center text-xl">↓</div>
                <div>
                  <h3 className="font-bold text-white">Deposit {isUsdc ? "USDC" : "SOL"}</h3>
                  <p className="text-slate-400 text-xs">
                    {isUsdc ? "Solana ATA → MagicBlock ephemeral rollup" : "SOL → StealthID shielded pool"}
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Amount</label>
                <div className="flex items-center input overflow-hidden">
                  <span className="text-slate-400 px-4 text-base">{amtSymbol}</span>
                  <input type="number" min={isUsdc ? "1" : "0.001"} step={isUsdc ? "1000" : "0.1"}
                    value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder={isUsdc ? "1000000" : "0.1"}
                    className="flex-1 bg-transparent text-white text-sm py-3.5 outline-none font-mono" />
                  <span className="text-slate-500 text-xs pr-4 font-semibold">{amtUnit}</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">{amtHint}</p>
              </div>
              <button onClick={onDeposit} disabled={busy}
                className="btn-green w-full text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm">
                {busy ? <><div className="spinner" />Processing…</> : `↓ Deposit ${isUsdc ? "USDC" : "SOL"}`}
              </button>
            </div>
            {phase === "done" && txRes && <TxCard r={txRes} />}
            {phase === "error" && <ErrCard msg={errMsg} />}
          </div>
        )}

        {/* ── BALANCE ── */}
        {tab === "balance" && (
          <div className="space-y-4 anim-fade">
            <div className="glass rounded-2xl p-6 border border-purple-500/15">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-xl">◈</div>
                <div>
                  <h3 className="font-bold text-white">{isUsdc ? "USDC" : "SOL"} Balance</h3>
                  <p className="text-slate-400 text-xs">
                    {isUsdc ? "Base chain + ephemeral rollup balance" : "Solana devnet native balance"}
                  </p>
                </div>
              </div>
              <button onClick={onBalance} disabled={balLoad}
                className="btn-primary w-full text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm">
                {balLoad ? <><div className="spinner" />Fetching…</> : `🔍 Check ${isUsdc ? "USDC" : "SOL"} Balance`}
              </button>
            </div>

            {isUsdc && usdcBal && (
              <div className="glass rounded-2xl p-5 border border-purple-500/15 space-y-4 anim-fade">
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Base Chain</p>
                    <p className="text-xl font-black text-white">{(parseInt(usdcBal.baseBal||"0")/1_000_000).toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">USDC</p>
                  </div>
                  <div className="glass rounded-xl p-4 border border-purple-500/20 bg-purple-500/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Private (Ephemeral)</p>
                    <p className="text-xl font-black text-purple-300">{(parseInt(usdcBal.privBal||"0")/1_000_000).toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">USDC</p>
                  </div>
                </div>
                {usdcBal.ata && <HR label="Associated Token Account (ATA)" value={usdcBal.ata} color="text-slate-400" />}
                <HR label="USDC Mint" value={DEVNET_USDC} color="text-blue-300" />
              </div>
            )}

            {!isUsdc && solBal && (
              <div className="glass rounded-2xl p-5 border border-purple-500/15 anim-fade">
                <div className="glass rounded-xl p-5 border border-purple-500/20 bg-purple-500/5 mb-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Wallet Balance</p>
                  <p className="text-3xl font-black text-white">{solBal.sol.toFixed(4)} <span className="text-lg text-slate-400 font-normal">SOL</span></p>
                  <p className="font-mono text-[10px] text-slate-500 mt-1">{solBal.lamports.toLocaleString()} lamports</p>
                </div>
                <HR label="Wallet Address" value={publicKey?.toBase58() ?? ""} color="text-purple-300" />
              </div>
            )}
          </div>
        )}

        {/* ── TRANSFER ── */}
        {tab === "transfer" && (
          <div className="space-y-4 anim-fade">
            <div className="glass rounded-2xl p-6 border border-blue-500/15">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-xl">↔</div>
                <div>
                  <h3 className="font-bold text-white">Private {isUsdc ? "USDC" : "SOL"} Transfer</h3>
                  <p className="text-slate-400 text-xs">
                    {isUsdc ? "Private visibility · amount + receiver hidden on-chain" : "SOL transfer via shielded pool"}
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Recipient</label>
                <input type="text" value={toAddr} onChange={e => setToAddr(e.target.value)}
                  placeholder="Recipient wallet address"
                  className="input w-full px-4 py-3 text-sm font-mono" />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Amount</label>
                <div className="flex items-center input overflow-hidden">
                  <span className="text-slate-400 px-4">{amtSymbol}</span>
                  <input type="number" min={isUsdc ? "1" : "0.001"} step={isUsdc ? "1000" : "0.1"}
                    value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder={isUsdc ? "1000000" : "0.1"}
                    className="flex-1 bg-transparent text-white text-sm py-3.5 outline-none font-mono" />
                  <span className="text-slate-500 text-xs pr-4 font-semibold">{amtUnit}</span>
                </div>
              </div>
              <button onClick={onTransfer} disabled={busy || !toAddr}
                className="btn-primary w-full text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm">
                {busy ? <><div className="spinner" />Processing…</> : `↔ Transfer ${isUsdc ? "USDC" : "SOL"} Privately`}
              </button>
              {!toAddr && <p className="text-[10px] text-slate-600 mt-1.5">Enter a recipient address to continue</p>}
            </div>
            {phase === "done" && txRes && <TxCard r={txRes} />}
            {phase === "error" && <ErrCard msg={errMsg} />}
          </div>
        )}

        {/* ── WITHDRAW ── */}
        {tab === "withdraw" && (
          <div className="space-y-4 anim-fade">
            <div className="glass rounded-2xl p-6 border border-orange-500/15">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center text-xl">↑</div>
                <div>
                  <h3 className="font-bold text-white">Withdraw {isUsdc ? "USDC" : "SOL"}</h3>
                  <p className="text-slate-400 text-xs">
                    {isUsdc ? "Ephemeral rollup → Solana base chain" : "Server sends SOL back to your wallet"}
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Amount</label>
                <div className="flex items-center input overflow-hidden">
                  <span className="text-slate-400 px-4">{amtSymbol}</span>
                  <input type="number" min={isUsdc ? "1" : "0.001"} step={isUsdc ? "1000" : "0.1"}
                    value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder={isUsdc ? "1000000" : "0.1"}
                    className="flex-1 bg-transparent text-white text-sm py-3.5 outline-none font-mono" />
                  <span className="text-slate-500 text-xs pr-4 font-semibold">{amtUnit}</span>
                </div>
                {!isUsdc && <p className="text-[10px] text-slate-600 mt-1">Max 0.1 SOL per withdrawal</p>}
              </div>
              <button onClick={onWithdraw} disabled={busy}
                className="btn-orange w-full text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm">
                {busy ? <><div className="spinner" />Processing…</> : `↑ Withdraw ${isUsdc ? "USDC" : "SOL"}`}
              </button>
            </div>
            {phase === "done" && txRes && <TxCard r={txRes} />}
            {phase === "error" && <ErrCard msg={errMsg} />}
          </div>
        )}

      </div>
    </div>
  );
}
