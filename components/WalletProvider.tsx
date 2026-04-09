"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl("devnet"),
    []
  );
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {/* suppressHydrationWarning prevents Phantom adapter <i> tag mismatch */}
        <WalletModalProvider>
          <div suppressHydrationWarning>{children}</div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
