/**
 * communityApi.ts — thin client for the OnlyMonkes worker's /api/community/*
 * endpoints (worker-actions/src/community.ts in the main OnlyMonkes repo).
 *
 * Write calls (setLocation, createEvent, rsvp) require a wallet signature
 * over a fixed message shape the worker reconstructs and verifies:
 *   `OnlyMonkes Community\n${action}\n${wallet}\n${ts}`
 * `signMessage` must come from a connected Solana wallet adapter (Phantom/
 * Solflare/etc. all implement it). The worker ALSO independently verifies
 * the wallet holds a real Saga Monke on-chain — signing alone isn't enough
 * to write, matching the app's own holder gate.
 */

const WORKER_BASE = process.env.NEXT_PUBLIC_WORKER_BASE_URL ?? "https://onlymonkes-actions.jumpstreet25.workers.dev";

export interface CommunityLocation {
  wallet: string;
  username: string | null;
  lat: number;
  lng: number;
  label: string;
  nftImage: string | null;
  updatedAt: number;
}

export interface CommunityEventSummary {
  id: string;
  title: string;
  lat: number;
  lng: number;
  label: string;
  startTime: number;
  endTime: number | null;
  rsvpCount: number;
  createdBy: string;
}

export interface CommunityEvent extends CommunityEventSummary {
  description: string;
  createdByWallet: string;
  createdAt: number;
}

/** A connected wallet adapter's signMessage — matches @solana/wallet-adapter-base's SignerWalletAdapter shape. */
export type SignMessageFn = (message: Uint8Array) => Promise<Uint8Array>;

async function signAuth(action: string, wallet: string, signMessage: SignMessageFn) {
  const ts = Date.now();
  const message = new TextEncoder().encode(`OnlyMonkes Community\n${action}\n${wallet}\n${ts}`);
  const sigBytes = await signMessage(message);
  const signature = btoa(String.fromCharCode(...sigBytes));
  return { ts, signature };
}

async function postJson(path: string, body: unknown) {
  const res = await fetch(`${WORKER_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`);
  return json;
}

export async function getLocations(): Promise<CommunityLocation[]> {
  const res = await fetch(`${WORKER_BASE}/api/community/locations`);
  const json = await res.json();
  return json.locations ?? [];
}

export async function getEvents(): Promise<CommunityEventSummary[]> {
  const res = await fetch(`${WORKER_BASE}/api/community/events`);
  const json = await res.json();
  return json.events ?? [];
}

export async function getEvent(id: string): Promise<CommunityEvent | null> {
  const res = await fetch(`${WORKER_BASE}/api/community/events/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.event ?? null;
}

export async function getRsvps(id: string): Promise<string[]> {
  const res = await fetch(`${WORKER_BASE}/api/community/events/${encodeURIComponent(id)}/rsvps`);
  const json = await res.json();
  return json.attendees ?? [];
}

/** Only the caller's own RSVP status — the public attendee list (getRsvps) never exposes wallets. */
export async function getMyRsvpStatus(id: string, wallet: string): Promise<boolean> {
  const res = await fetch(`${WORKER_BASE}/api/community/events/${encodeURIComponent(id)}/rsvp-status?wallet=${encodeURIComponent(wallet)}`);
  const json = await res.json();
  return !!json.going;
}

export async function setLocation(
  wallet: string,
  signMessage: SignMessageFn,
  data: { lat: number; lng: number; label: string; username?: string; nftImage?: string },
): Promise<void> {
  const { ts, signature } = await signAuth("set-location", wallet, signMessage);
  await postJson("/api/community/location", { wallet, ts, signature, ...data });
}

export async function createEvent(
  wallet: string,
  signMessage: SignMessageFn,
  data: { title: string; description?: string; lat: number; lng: number; label?: string; startTime: number; endTime?: number; username?: string },
): Promise<string> {
  const { ts, signature } = await signAuth("create-event", wallet, signMessage);
  const json = await postJson("/api/community/events", { wallet, ts, signature, ...data });
  return json.id;
}

export async function rsvp(
  id: string,
  wallet: string,
  signMessage: SignMessageFn,
  going: boolean,
  username?: string,
): Promise<void> {
  const { ts, signature } = await signAuth(`rsvp:${id}`, wallet, signMessage);
  await postJson(`/api/community/events/${encodeURIComponent(id)}/rsvp`, { wallet, ts, signature, going, username });
}
