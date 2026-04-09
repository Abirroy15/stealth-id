"use client";

import { useState, useCallback } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}

/** Robust clipboard copy with execCommand fallback for non-HTTPS / focus issues */
async function copyToClipboard(text: string): Promise<boolean> {
  // Modern API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy
    }
  }
  // Legacy execCommand fallback
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({ text, label = "COPY", className = "", iconOnly = false }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyToClipboard(text);
    setState(ok ? "ok" : "err");
    setTimeout(() => setState("idle"), 2000);
  }, [text]);

  if (iconOnly) {
    return (
      <button
        onClick={handleClick}
        title={state === "ok" ? "Copied!" : `Copy: ${text}`}
        className={`inline-flex items-center justify-center w-6 h-6 rounded transition-all
          ${state === "ok" ? "text-jade" : state === "err" ? "text-crimson" : "text-silver-muted hover:text-cyan"}
          ${className}`}
      >
        {state === "ok" ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : state === "err" ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="4" y="1" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.05"/>
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`font-mono text-[10px] px-3 py-1.5 rounded border transition-all tracking-wider
        ${state === "ok"
          ? "border-jade/40 text-jade bg-jade/5"
          : state === "err"
          ? "border-crimson/40 text-crimson bg-crimson/5"
          : "border-silver-muted/30 text-silver-dim hover:border-cyan/40 hover:text-cyan"
        }
        ${className}`}
    >
      {state === "ok" ? "✓ COPIED" : state === "err" ? "✗ FAILED" : label}
    </button>
  );
}

/** Inline copyable hash row: truncated text + copy icon + optional explorer link */
interface HashRowProps {
  label: string;
  value: string;                // full value to copy
  display?: string;             // truncated display (defaults to auto-truncate)
  color?: string;
  explorerUrl?: string;
  explorerLabel?: string;
  explorerUrl2?: string;
  explorerLabel2?: string;
}

export function HashRow({
  label,
  value,
  display,
  color = "text-white",
  explorerUrl,
  explorerLabel = "Explorer",
  explorerUrl2,
  explorerLabel2,
}: HashRowProps) {
  const shown = display ?? (value.length > 28 ? `${value.slice(0, 14)}…${value.slice(-8)}` : value);

  return (
    <div className="flex items-start gap-3 text-xs group">
      <span className="font-mono text-silver-muted w-28 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-mono ${color} break-all`}>{shown}</span>
          <CopyButton text={value} iconOnly />
        </div>
        {(explorerUrl || explorerUrl2) && (
          <div className="flex items-center gap-2 mt-1">
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[9px] text-silver-muted hover:text-cyan transition-colors border border-silver-muted/20 hover:border-cyan/30 px-1.5 py-0.5 rounded"
              >
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {explorerLabel}
              </a>
            )}
            {explorerUrl2 && (
              <a
                href={explorerUrl2}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[9px] text-silver-muted hover:text-[#9945FF] transition-colors border border-silver-muted/20 hover:border-[#9945FF]/30 px-1.5 py-0.5 rounded"
              >
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {explorerLabel2}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
