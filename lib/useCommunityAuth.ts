"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import type { SignMessageFn } from "./communityApi";

/**
 * Bundles the connected wallet's address + a signMessage function in the
 * shape communityApi.ts expects. Returns null for signMessage when no
 * wallet is connected or the connected wallet doesn't support message
 * signing (rare, but some wallet-standard wallets only expose signTransaction).
 */
export function useCommunityAuth(): { wallet: string | null; signMessage: SignMessageFn | null } {
  const { publicKey, signMessage } = useWallet();
  if (!publicKey || !signMessage) return { wallet: null, signMessage: null };
  return {
    wallet: publicKey.toBase58(),
    signMessage: async (message: Uint8Array) => signMessage(message),
  };
}
