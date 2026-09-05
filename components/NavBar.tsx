"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function NavBar() {
  return (
    // 2026-09-05: was a single non-wrapping flex row — on a phone-width
    // viewport (the primary use case here, Seeker/mobile browsers), the
    // logo + 3 links + WalletMultiButton together are wider than the
    // screen with nothing to wrap or shrink, so the wallet button (last
    // item, right-aligned via justify-between) got pushed off-screen and
    // visually clipped instead of ever actually overflowing onto a new
    // line. flex-wrap lets the links drop to their own row first; the
    // button keeps shrink-0 so it's never the thing that gets squeezed.
    <nav className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6 py-3 border-b border-white/10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-6">
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
          <span className="sm:hidden">Share location</span>
          <span className="hidden sm:inline">Share my location</span>
        </Link>
      </div>
      <div className="shrink-0">
        <WalletMultiButton />
      </div>
    </nav>
  );
}
