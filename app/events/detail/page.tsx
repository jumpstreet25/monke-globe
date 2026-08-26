"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getEvent, getRsvps, getMyRsvpStatus, rsvp, type CommunityEvent } from "@/lib/communityApi";
import { useCommunityAuth } from "@/lib/useCommunityAuth";

function EventDetail() {
  const id = useSearchParams().get("id");
  const { wallet, signMessage } = useCommunityAuth();
  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [going, setGoing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getEvent(id), getRsvps(id), wallet ? getMyRsvpStatus(id, wallet) : Promise.resolve(false)])
      .then(([ev, rsvps, mine]) => {
        setEvent(ev);
        setAttendees(rsvps);
        setGoing(mine);
      })
      .finally(() => setLoading(false));
  }, [id, wallet]);

  async function handleRsvp(nextGoing: boolean) {
    if (!id || !wallet || !signMessage) return;
    setBusy(true);
    setError(null);
    try {
      await rsvp(id, wallet, signMessage, nextGoing);
      const [ev, rsvps] = await Promise.all([getEvent(id), getRsvps(id)]);
      setEvent(ev);
      setAttendees(rsvps);
      setGoing(nextGoing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "RSVP failed");
    } finally {
      setBusy(false);
    }
  }

  if (!id) return <p className="max-w-2xl mx-auto px-4 py-8 text-white/60">No event specified.</p>;
  if (loading) return <p className="max-w-2xl mx-auto px-4 py-8 text-white/60">Loading…</p>;
  if (!event) return <p className="max-w-2xl mx-auto px-4 py-8 text-white/60">Event not found.</p>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold">{event.title}</h1>
      <p className="text-white/60 mt-1">
        {new Date(event.startTime).toLocaleString()}
        {event.endTime ? ` – ${new Date(event.endTime).toLocaleString()}` : ""}
      </p>
      <p className="text-white/60">{event.label}</p>
      {event.description && <p className="mt-4 whitespace-pre-wrap">{event.description}</p>}

      <div className="mt-6 flex items-center gap-3">
        {!wallet && <p className="text-sm text-white/50">Connect your wallet to RSVP.</p>}
        {wallet && !going && (
          <button
            onClick={() => handleRsvp(true)}
            disabled={busy}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-full px-4 py-2 text-sm"
          >
            I&apos;m going
          </button>
        )}
        {wallet && going && (
          <button
            onClick={() => handleRsvp(false)}
            disabled={busy}
            className="bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-full px-4 py-2 text-sm"
          >
            ✓ Going — cancel RSVP
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

      <h2 className="text-lg font-medium mt-8 mb-2">{event.rsvpCount} going</h2>
      <ul className="text-white/70 text-sm space-y-1">
        {attendees.map((name, i) => (
          <li key={i}>{name}</li>
        ))}
      </ul>
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <Suspense fallback={<p className="max-w-2xl mx-auto px-4 py-8 text-white/60">Loading…</p>}>
      <EventDetail />
    </Suspense>
  );
}
