"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/wallet",    label: "Wallet"    },
  { href: "/generate",  label: "Proofs"    },
  { href: "/airdrop",   label: "Airdrop"   },
];

export function NavBar() {
  const { connected } = useWallet();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/[0.07]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0 mr-2">
          <div className="relative w-7 h-7">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-purple-400 to-blue-500" />
            <div className="absolute inset-0 rounded-full" style={{ boxShadow: "0 0 12px rgba(139,92,246,0.5)" }} />
          </div>
          <span className="font-bold text-sm tracking-tight">
            <span className="text-white">Stealth</span>
            <span className="gradient-text">ID</span>
          </span>
        </Link>

        {/* Nav links */}
        {mounted && connected && (
          <div className="flex items-center gap-1 flex-1">
            {NAV.map((n) => {
              const active = pathname === n.href;
              return (
                <Link key={n.href} href={n.href}
                  className={"px-3 py-1.5 rounded-lg text-sm font-medium transition-all " +
                    (active
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "text-slate-400 hover:text-white hover:bg-white/5")}>
                  {n.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Wallet button */}
        <div className="ml-auto" suppressHydrationWarning>
          {mounted && <WalletMultiButton />}
        </div>
      </div>
    </nav>
  );
}
