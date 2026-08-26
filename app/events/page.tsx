"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getEvents, type CommunityEventSummary } from "@/lib/communityApi";

export default function EventsPage() {
  const [events, setEvents] = useState<CommunityEventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvents().then(setEvents).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Upcoming Events</h1>
        <Link href="/events/new" className="text-sm bg-purple-600 hover:bg-purple-500 rounded-full px-4 py-2">
          + New event
        </Link>
      </div>

      {loading && <p className="text-white/60">Loading…</p>}
      {!loading && events.length === 0 && (
        <p className="text-white/60">No upcoming events yet — be the first to post one 🐒</p>
      )}

      <ul className="space-y-3">
        {events.map((e) => (
          <li key={e.id}>
            <Link
              href={`/events/detail?id=${encodeURIComponent(e.id)}`}
              className="block rounded-xl border border-white/10 hover:border-white/30 px-4 py-3 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{e.title}</span>
                <span className="text-sm text-white/50">{e.rsvpCount} going</span>
              </div>
              <div className="text-sm text-white/60 mt-1">
                {new Date(e.startTime).toLocaleString()} · {e.label || "Location TBD"}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
