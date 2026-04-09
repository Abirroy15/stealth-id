"use client";

interface ProofCardProps {
  proofId: string;
  label: string;
  type: string;
  createdAt: number;
  expiresAt: number;
  commitment: string;
  erReceipt?: string;
  solanaTxSig?: string;
  onShare?: (id: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  balance: "text-jade border-jade/30 bg-jade/5",
  membership: "text-cyan border-cyan/30 bg-cyan/5",
  payment: "text-[#c77dff] border-[#c77dff]/30 bg-[#c77dff]/5",
};

const TYPE_ICONS: Record<string, string> = {
  balance: "◈",
  membership: "⬡",
  payment: "◉",
};

export function ProofCard({
  proofId,
  label,
  type,
  createdAt,
  expiresAt,
  commitment,
  erReceipt,
  solanaTxSig,
  onShare,
}: ProofCardProps) {
  const expired = Date.now() > expiresAt;
  const colorClass = TYPE_COLORS[type] ?? "text-silver border-silver/30 bg-silver/5";
  const icon = TYPE_ICONS[type] ?? "○";

  const timeLeft = Math.max(0, expiresAt - Date.now());
  const hoursLeft = Math.floor(timeLeft / 3_600_000);

  return (
    <div className="relative group border border-silver-muted/20 bg-void-2 rounded-lg p-5 hover:border-silver-muted/40 transition-all">
      {/* Glow on hover */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-cyan/3 to-transparent pointer-events-none" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Type badge */}
          <span
            className={`inline-flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 rounded border ${colorClass} mb-3`}
          >
            <span>{icon}</span>
            {type.toUpperCase()}
          </span>

          {/* Label */}
          <h3 className="font-display text-white text-base font-semibold mb-1">
            {label}
          </h3>

          {/* Commitment */}
          <p className="font-mono text-[10px] text-silver-dim truncate mb-3">
            Commitment: {commitment.slice(0, 20)}…
          </p>

          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-[10px] font-mono text-silver-muted">
            <span>
              Created:{" "}
              {new Date(createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className={expired ? "text-crimson" : "text-jade/70"}>
              {expired ? "EXPIRED" : `${hoursLeft}h remaining`}
            </span>
          </div>

          {erReceipt && (
            <div className="mt-2 font-mono text-[9px] text-silver-muted/60 truncate">
              ER: {erReceipt.slice(0, 30)}…
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={() => onShare?.(proofId)}
            className="font-mono text-[10px] text-cyan border border-cyan/30 hover:border-cyan/60 hover:bg-cyan/5 px-3 py-1.5 rounded transition-all tracking-wider"
          >
            SHARE
          </button>
          <a
            href={`/verify/${proofId}`}
            target="_blank"
            className="font-mono text-[10px] text-silver-dim border border-silver-muted/30 hover:border-silver-dim/50 hover:bg-silver/5 px-3 py-1.5 rounded transition-all tracking-wider text-center"
          >
            VERIFY
          </a>
        </div>
      </div>
    </div>
  );
}
