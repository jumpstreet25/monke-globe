"use client";

/**
 * Wraps the app in Solana wallet-adapter context. No explicit wallet list —
 * modern wallets (Phantom, Solflare, Backpack, etc.) self-register via the
 * Wallet Standard and are auto-detected by @solana/wallet-adapter-react
 * without needing per-wallet adapter packages.
 */
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

export function WalletProviders({ children }: { children: React.ReactNode }) {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={rpcUrl}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
