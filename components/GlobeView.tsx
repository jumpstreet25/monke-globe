"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { getLocations, getEvents, getLumaEvents, type CommunityLocation, type CommunityEventSummary, type LumaEvent } from "@/lib/communityApi";
import { useRouter } from "next/navigation";

// react-globe.gl touches `window`/WebGL at import time — must never run
// during the static build, only in the browser.
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

type Marker =
  | { kind: "user"; lat: number; lng: number; label: string; nftImage: string | null }
  | { kind: "event"; lat: number; lng: number; label: string; id: string }
  | { kind: "luma-event"; lat: number; lng: number; label: string; url: string };

export function GlobeView() {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [userPills, setUserPills] = useState<{ label: string; nftImage: string | null }[]>([]);
  const [lumaEvents, setLumaEvents] = useState<LumaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const router = useRouter();

  useEffect(() => {
    Promise.all([getLocations(), getEvents(), getLumaEvents()])
      .then(([locations, events, luma]: [CommunityLocation[], CommunityEventSummary[], LumaEvent[]]) => {
        // Multiple holders in the same city geocode to the exact same
        // lat/lng (Nominatim returns one centroid per place name) — two
        // htmlElementsData markers sitting at identical coordinates can
        // render stacked exactly on top of each other, so only the topmost
        // one is ever visible/clickable. Spread same-spot markers into a
        // small ring around the shared point, deterministic by wallet so a
        // given user doesn't jump around between loads.
        const byCoord = new Map<string, CommunityLocation[]>();
        for (const l of locations) {
          const key = `${l.lat.toFixed(3)},${l.lng.toFixed(3)}`;
          const group = byCoord.get(key);
          if (group) group.push(l); else byCoord.set(key, [l]);
        }
        const JITTER_DEGREES = 0.4;
        const userMarkers: Marker[] = Array.from(byCoord.values()).flatMap((group) =>
          group.map((l, i) => {
            const angle = (i / group.length) * 2 * Math.PI;
            const spread = group.length > 1 ? JITTER_DEGREES : 0;
            return {
              kind: "user" as const,
              lat: l.lat + spread * Math.sin(angle),
              lng: l.lng + spread * Math.cos(angle),
              label: l.username ?? "Monke",
              nftImage: l.nftImage,
            };
          })
        );
        const eventMarkers: Marker[] = events.map((e) => ({
          kind: "event",
          lat: e.lat,
          lng: e.lng,
          label: e.title,
          id: e.id,
        }));
        // Only Luma events with known coordinates get a globe pin — the
        // rest (online-only, or a city we couldn't place) still show in the
        // list below, same "online events" split the in-app globe does.
        const lumaMarkers: Marker[] = luma
          .filter((e) => typeof e.lat === "number" && typeof e.lng === "number")
          .map((e) => ({ kind: "luma-event", lat: e.lat!, lng: e.lng!, label: e.name, url: e.url }));

        setMarkers([...userMarkers, ...eventMarkers, ...lumaMarkers]);
        setUserPills(locations.map((l) => ({ label: l.username ?? "Monke", nftImage: l.nftImage })));
        setLumaEvents(luma);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const userMarkerCount = markers.filter((m) => m.kind === "user").length;
  const lumaMarkerCount = markers.filter((m) => m.kind === "luma-event").length;
  const eventMarkerCount = markers.filter((m) => m.kind === "event").length;

  return (
    <div className="w-full min-h-[calc(100vh-57px)] flex flex-col">
      <div ref={containerRef} className="w-full h-[60vh] relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white/60 z-10">
            Loading Monkes…
          </div>
        )}
        {!loading && markers.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 rounded-full px-4 py-2 text-sm text-white/70 z-10">
            No public locations or events yet — be the first 🐒
          </div>
        )}
        <Globe
          width={size.width}
          height={size.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          backgroundColor="#000000"
          htmlElementsData={markers}
          htmlLat={(d) => (d as Marker).lat}
          htmlLng={(d) => (d as Marker).lng}
          htmlElement={(d) => {
            const m = d as Marker;
            const el = document.createElement("div");
            el.style.cursor = "pointer";
            el.title = m.label;
            if (m.kind === "user") {
              el.style.width = "28px";
              el.style.height = "28px";
              el.style.borderRadius = "50%";
              el.style.border = "2px solid #9945FF";
              el.style.backgroundSize = "cover";
              el.style.backgroundPosition = "center";
              el.style.backgroundColor = "#222";
              if (m.nftImage) el.style.backgroundImage = `url(${m.nftImage})`;
            } else if (m.kind === "luma-event") {
              el.style.width = "16px";
              el.style.height = "16px";
              el.style.borderRadius = "50%";
              el.style.background = "#6CB4EE";
              el.style.border = "2px solid white";
              el.onclick = () => window.open(m.url, "_blank", "noopener,noreferrer");
            } else {
              el.style.width = "16px";
              el.style.height = "16px";
              el.style.borderRadius = "50%";
              el.style.background = "#10B981";
              el.style.border = "2px solid white";
              el.onclick = () => router.push(`/events/detail?id=${encodeURIComponent(m.id)}`);
            }
            return el;
          }}
        />
      </div>

      {/* Legend — mirrors the in-app globe's three categories */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-white/10 text-xs text-white/70">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#9945FF" }} />
          Monkes ({userMarkerCount})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#6CB4EE" }} />
          Solana Events ({lumaEvents.length})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#10B981" }} />
          IRL ({eventMarkerCount})
        </span>
      </div>

      {/* Rows of Monkes — PFP pills, same style/layout as the in-app globe */}
      {userPills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-3">
          {userPills.map((p, i) => (
            <div
              key={`${p.label}-${i}`}
              className="flex items-center gap-1.5 rounded-2xl px-2 py-1.5 max-w-[48%]"
              style={{ background: "rgba(153,69,255,0.1)", border: "1px solid rgba(153,69,255,0.15)" }}
            >
              {p.nftImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.nftImage} alt="" className="w-[22px] h-[22px] rounded-full object-cover" />
              ) : (
                <div className="w-[22px] h-[22px] rounded-full" style={{ background: "rgba(153,69,255,0.2)" }} />
              )}
              <span className="text-xs text-white truncate">{p.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Solana Events — pulled live from Lu.ma calendars + solana.com/events,
          same source the in-app globe uses (see communityApi.ts getLumaEvents). */}
      {lumaEvents.length > 0 && (
        <div className="px-4 pb-6">
          <div className="text-xs font-semibold text-white/60 mb-1.5">
            🌐 Solana Events ({lumaEvents.length})
          </div>
          <div className="flex flex-col gap-1 max-h-[240px] overflow-y-auto">
            {lumaEvents.map((e) => (
              <a
                key={e.id}
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "rgba(108,180,238,0.06)", border: "1px solid rgba(108,180,238,0.10)" }}
              >
                <div className="flex-1 min-w-0 mr-2">
                  <div className="text-xs text-white truncate">{e.name}</div>
                  <div className="text-[10px] text-white/50 mt-0.5">
                    {e.startAt ? new Date(e.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                </div>
                <span className="text-sm" style={{ color: "#6CB4EE" }}>→</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
