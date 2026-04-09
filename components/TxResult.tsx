"use client";

import { CopyButton, HashRow } from "@/components/CopyButton";

interface TxResultProps {
  txSig?: string;
  erReceipt?: string;
  commitment?: string;
  nullifier?: string;
  label?: string;
  color?: "jade" | "cyan" | "purple";
  cluster?: string;
}

const COLORS = {
  jade:   { border: "border-jade/20",      bg: "bg-jade/5",      text: "text-jade",      icon: "#00ff88" },
  cyan:   { border: "border-cyan/20",      bg: "bg-cyan/5",      text: "text-cyan",      icon: "#00d4ff" },
  purple: { border: "border-[#9945FF]/20", bg: "bg-[#9945FF]/5", text: "text-[#9945FF]", icon: "#9945FF" },
};

export function TxResult({
  txSig,
  erReceipt,
  commitment,
  nullifier,
  label = "Transaction Complete",
  color = "jade",
  cluster = "devnet",
}: TxResultProps) {
  const c = COLORS[color];
  const hasTx = txSig && txSig.length > 20;

  return (
    <div className={`border ${c.border} ${c.bg} rounded-lg p-4`}>
      <p className={`font-mono text-xs font-bold ${c.text} mb-3`}>{label}</p>

      <div className="space-y-2">
        {hasTx && (
          <HashRow
            label="Tx Sig"
            value={txSig!}
            color="text-[#9945FF]"
            explorerUrl={`https://solscan.io/tx/${txSig}?cluster=${cluster}`}
            explorerLabel="Solscan"
            explorerUrl2={`https://explorer.solana.com/tx/${txSig}?cluster=${cluster}`}
            explorerLabel2="Explorer"
          />
        )}
        {erReceipt  && <HashRow label="ER Receipt"  value={erReceipt}  color="text-cyan" />}
        {commitment && <HashRow label="Commitment"  value={commitment} color="text-silver-dim" />}
        {nullifier  && <HashRow label="Nullifier"   value={nullifier}  color="text-silver-dim" />}
      </div>

      {hasTx && (
        <div className="flex gap-2 mt-3">
          <a
            href={`https://solscan.io/tx/${txSig}?cluster=${cluster}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold border border-[#9945FF]/40 text-[#9945FF] hover:bg-[#9945FF]/10 px-3 py-1.5 rounded transition-all"
          >
            <ExternalIcon /> VIEW ON SOLSCAN
          </a>
          <a
            href={`https://explorer.solana.com/tx/${txSig}?cluster=${cluster}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] border border-silver-muted/30 text-silver-dim hover:text-white px-3 py-1.5 rounded transition-all"
          >
            <ExternalIcon /> EXPLORER
          </a>
          <CopyButton text={txSig!} label="COPY SIG" />
        </div>
      )}
    </div>
  );
}

function ExternalIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
      <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
