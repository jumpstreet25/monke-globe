"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function NavBar() {
  return (
    <nav className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-white/10">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold tracking-tight text-lg">
          🐒 MonkeGlobe
        </Link>
        <Link href="/globe" className="text-sm text-white/70 hover:text-white">
          Globe
        </Link>
        <Link href="/events" className="text-sm text-white/70 hover:text-white">
          Events
        </Link>
        <Link href="/share-location" className="text-sm text-white/70 hover:text-white">
          Share my location
        </Link>
      </div>
      <WalletMultiButton />
    </nav>
  );
}
