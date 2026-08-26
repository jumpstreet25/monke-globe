"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { getLocations, getEvents, type CommunityLocation, type CommunityEventSummary } from "@/lib/communityApi";
import { useRouter } from "next/navigation";

// react-globe.gl touches `window`/WebGL at import time — must never run
// during the static build, only in the browser.
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

type Marker =
  | { kind: "user"; lat: number; lng: number; label: string; nftImage: string | null }
  | { kind: "event"; lat: number; lng: number; label: string; id: string };

export function GlobeView() {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const router = useRouter();

  useEffect(() => {
    Promise.all([getLocations(), getEvents()])
      .then(([locations, events]: [CommunityLocation[], CommunityEventSummary[]]) => {
        const userMarkers: Marker[] = locations.map((l) => ({
          kind: "user",
          lat: l.lat,
          lng: l.lng,
          label: l.username ?? "Monke",
          nftImage: l.nftImage,
        }));
        const eventMarkers: Marker[] = events.map((e) => ({
          kind: "event",
          lat: e.lat,
          lng: e.lng,
          label: e.title,
          id: e.id,
        }));
        setMarkers([...userMarkers, ...eventMarkers]);
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

  return (
    <div ref={containerRef} className="w-full h-[calc(100vh-57px)] relative">
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
  );
}
