"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { getLocations, getEvents, getLumaEvents, type CommunityLocation, type CommunityEventSummary, type LumaEvent } from "@/lib/communityApi";
import { useRouter } from "next/navigation";

// react-globe.gl touches `window`/WebGL at import time — must never run
// during the static build, only in the browser.
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

type Marker =
  | { kind: "user"; lat: number; lng: number; label: string; nftImage: string | null }
  | { kind: "event"; lat: number; lng: number; label: string; id: string };

type LumaObjMarker = { lat: number; lng: number; label: string; url: string };

// Solana logo (3 slanted bars, purple→green gradient) drawn once to a canvas
// texture and reused for every event beam — ported from the in-app globe's
// Three.js WebView content (assets/globe.html, getSolanaLogoTexture()) so
// both surfaces render the identical mark.
let _solanaLogoTexture: THREE.CanvasTexture | null = null;
function getSolanaLogoTexture(): THREE.CanvasTexture {
  if (_solanaLogoTexture) return _solanaLogoTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#9945FF");
  grad.addColorStop(1, "#14F195");
  ctx.fillStyle = grad;

  const barH = size * 0.18;
  const skew = size * 0.12;
  const pad = size * 0.15;
  const w = size - pad * 2;

  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad + w, pad);
  ctx.lineTo(pad + w - skew, pad + barH);
  ctx.lineTo(pad - skew, pad + barH);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  const midY = (size - barH) / 2;
  ctx.moveTo(pad - skew, midY);
  ctx.lineTo(pad + w - skew, midY);
  ctx.lineTo(pad + w, midY + barH);
  ctx.lineTo(pad, midY + barH);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  const botY = size - pad - barH;
  ctx.moveTo(pad, botY);
  ctx.lineTo(pad + w, botY);
  ctx.lineTo(pad + w - skew, botY + barH);
  ctx.lineTo(pad - skew, botY + barH);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  _solanaLogoTexture = tex;
  return tex;
}

// Beam + logo sprite for one Solana event marker. react-globe.gl positions
// and orients this via objectLat/objectLng/objectAltitude + objectFacesSurface
// (the object's local +Y is rotated to point away from the globe center at
// that lat/lng) — so unlike the in-app WebView's raw Three.js code, no
// manual lookAt/rotation math is needed here, just build the shape pointing
// up the local Y axis with its base at y=0.
function buildEventBeamObject(): THREE.Object3D {
  const group = new THREE.Group();

  const BEAM_HEIGHT = 8;
  const beamGeo = new THREE.CylinderGeometry(0.35, 0.35, BEAM_HEIGHT, 6);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x9945ff, transparent: true, opacity: 0.5 });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = BEAM_HEIGHT / 2;
  group.add(beam);

  const logoMat = new THREE.SpriteMaterial({ map: getSolanaLogoTexture(), transparent: true, opacity: 0.85, depthTest: false });
  const logo = new THREE.Sprite(logoMat);
  logo.position.y = BEAM_HEIGHT + 3;
  logo.scale.set(6, 6, 1);
  group.add(logo);

  return group;
}

export function GlobeView() {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [lumaObjMarkers, setLumaObjMarkers] = useState<LumaObjMarker[]>([]);
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
        // Rendered via the separate objects layer (beam + Solana logo), not
        // htmlElementsData — see buildEventBeamObject above.
        const lumaMarkers: LumaObjMarker[] = luma
          .filter((e) => typeof e.lat === "number" && typeof e.lng === "number")
          .map((e) => ({ lat: e.lat!, lng: e.lng!, label: e.name, url: e.url }));

        setMarkers([...userMarkers, ...eventMarkers]);
        setLumaObjMarkers(lumaMarkers);
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
  const eventMarkerCount = markers.filter((m) => m.kind === "event").length;

  return (
    <div className="w-full min-h-[calc(100vh-57px)] flex flex-col">
      <div ref={containerRef} className="w-full h-[60vh] relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white/60 z-10">
            Loading Monkes…
          </div>
        )}
        {!loading && markers.length === 0 && lumaObjMarkers.length === 0 && (
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
          objectsData={lumaObjMarkers}
          objectLat={(d) => (d as LumaObjMarker).lat}
          objectLng={(d) => (d as LumaObjMarker).lng}
          objectAltitude={0.005}
          objectFacesSurfaces={true}
          objectLabel={(d) => (d as LumaObjMarker).label}
          objectThreeObject={buildEventBeamObject}
          onObjectClick={(d) => window.open((d as LumaObjMarker).url, "_blank", "noopener,noreferrer")}
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

      {/* Two columns — Monkes / Solana Events — both flow with the page's
          own vertical scroll (no independent horizontal or capped-height
          scroll areas); a long list in either column just makes the page
          taller, same as the other one. */}
      {(userPills.length > 0 || lumaEvents.length > 0) && (
        <div className="grid grid-cols-2 gap-3 px-4 pb-6">
          <div>
            <div className="text-xs font-semibold text-white/60 mb-1.5">
              🐒 Monkes ({userPills.length})
            </div>
            <div className="flex flex-col gap-1">
              {userPills.map((p, i) => (
                <div
                  key={`${p.label}-${i}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                  style={{ background: "rgba(153,69,255,0.08)", border: "1px solid rgba(153,69,255,0.15)" }}
                >
                  {p.nftImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.nftImage} alt="" className="w-[22px] h-[22px] rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-[22px] h-[22px] rounded-full shrink-0" style={{ background: "rgba(153,69,255,0.2)" }} />
                  )}
                  <span className="text-xs text-white truncate">{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-white/60 mb-1.5">
              🌐 Solana Events ({lumaEvents.length})
            </div>
            <div className="flex flex-col gap-1">
              {lumaEvents.map((e) => (
                <a
                  key={e.id}
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col rounded-lg px-2 py-1.5"
                  style={{ background: "rgba(108,180,238,0.06)", border: "1px solid rgba(108,180,238,0.10)" }}
                >
                  <span className="text-xs text-white truncate">{e.name}</span>
                  <span className="text-[10px] text-white/50 mt-0.5 truncate">
                    {e.startAt ? new Date(e.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}
                    {e.location ? ` · ${e.location}` : ""}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
