"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setLocation } from "@/lib/communityApi";
import { geocodeLocation } from "@/lib/geocode";
import { useCommunityAuth } from "@/lib/useCommunityAuth";

export default function ShareLocationPage() {
  const { wallet, signMessage } = useCommunityAuth();
  const router = useRouter();
  const [locationQuery, setLocationQuery] = useState("");
  const [username, setUsername] = useState("");
  const [nftImage, setNftImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet || !signMessage) return;
    setBusy(true);
    setError(null);
    try {
      const geo = await geocodeLocation(locationQuery);
      if (!geo) throw new Error("Couldn't find that location — try a more specific place name");
      await setLocation(wallet, signMessage, {
        lat: geo.lat,
        lng: geo.lng,
        label: geo.label,
        username: username || undefined,
        nftImage: nftImage || undefined,
      });
      setDone(true);
      setTimeout(() => router.push("/globe"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't share location");
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <p className="text-white/60">Connect a wallet holding a Saga Monke to pin yourself on the globe.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Share your location</h1>
      <p className="text-sm text-white/50">
        This is public — anyone visiting the site can see it, same as everyone else&apos;s pin.
      </p>
      <input
        required
        placeholder="City, region…"
        value={locationQuery}
        onChange={(e) => setLocationQuery(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
      />
      <input
        placeholder="Display name (optional)"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
      />
      <input
        placeholder="PFP image URL (optional)"
        value={nftImage}
        onChange={(e) => setNftImage(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {done && <p className="text-emerald-400 text-sm">Pinned! Taking you to the globe…</p>}
      <button
        type="submit"
        disabled={busy}
        className="disabled:opacity-50 rounded-full px-5 py-2 text-sm text-[#0a1628] font-medium hover:brightness-90"
        style={{ background: "#6CB4EE" }}
      >
        {busy ? "Saving…" : "Pin me on the globe"}
      </button>
    </form>
  );
}
