import type { Metadata } from "next";
import "./globals.css";
import { SolanaWalletProvider } from "@/components/WalletProvider";
import { NavBar } from "@/components/NavBar";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "StealthID – Private Web3 Identity",
  description: "Prove anything. Reveal nothing. Powered by MagicBlock PER.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <SolanaWalletProvider>
          <ToastProvider>
            <NavBar />
            <div className="grid-bg fixed inset-0 pointer-events-none opacity-60" />
            <main className="relative pt-14 min-h-screen">{children}</main>
          </ToastProvider>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
