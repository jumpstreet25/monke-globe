"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "@/lib/communityApi";
import { geocodeLocation } from "@/lib/geocode";
import { useCommunityAuth } from "@/lib/useCommunityAuth";

export default function NewEventPage() {
  const { wallet, signMessage } = useCommunityAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [startTime, setStartTime] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet || !signMessage) return;
    setBusy(true);
    setError(null);
    try {
      const geo = await geocodeLocation(locationQuery);
      if (!geo) throw new Error("Couldn't find that location — try a more specific place name");
      const id = await createEvent(wallet, signMessage, {
        title,
        description,
        lat: geo.lat,
        lng: geo.lng,
        label: geo.label,
        startTime: new Date(startTime).getTime(),
        username: username || undefined,
      });
      router.push(`/events/detail?id=${encodeURIComponent(id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create event");
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <p className="text-white/60">Connect a wallet holding a Saga Monke to post an event.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">New Event</h1>
      <input
        required
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 h-24"
      />
      <input
        required
        placeholder="Location (city, venue, address…)"
        value={locationQuery}
        onChange={(e) => setLocationQuery(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
      />
      <input
        required
        type="datetime-local"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
      />
      <input
        placeholder="Display name (optional)"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-full px-5 py-2 text-sm"
      >
        {busy ? "Posting…" : "Post event"}
      </button>
    </form>
  );
}
