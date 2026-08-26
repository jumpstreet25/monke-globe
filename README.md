# MonkeGlobe

A public, forkable website for the Saga Monkes community: a 3D globe of holder
locations, plus an events calendar with RSVP. It's a companion to
[OnlyMonkes](https://github.com/jumpstreet25/OnlyMonkes) (the mobile app),
sharing the same backend — this is the public, no-login-required web mirror
of the app's in-app globe.

**Live**: https://monke-globe.pages.dev

## How it works

This is a static site (Next.js, `output: "export"`) — there is no server
runtime. Every page fetches its data client-side, in the browser, straight
from the OnlyMonkes worker API. That's what makes it forkable: fork the repo,
point a Cloudflare Pages (or any static host) project at it, and you have a
working copy with zero backend to stand up.

- **Reads** (locations, events) are public, no wallet needed.
- **Writes** (sharing your location, posting an event, RSVPing) require
  connecting a Solana wallet that holds a real Saga Monke — the wallet signs
  a message proving you control it, and the worker independently verifies
  Saga Monke ownership on-chain before accepting the write. Signing alone
  isn't enough.
- **Locations are public by default.** If you share your location in-app or
  on this site, anyone visiting the site can see it — there's no opt-in gate
  (an explicit product decision, not an oversight).

## Forking this

**A fork alone won't be live anywhere.** Cloudflare Pages doesn't
auto-deploy someone else's fork just because it exists on GitHub — you need
to connect *your own* Cloudflare account to *your* fork:

1. Fork this repo.
2. In the Cloudflare dashboard: Pages → Create a project → Connect to Git →
   pick your fork.
3. Build settings: build command `npm run build`, output directory `out`.
4. Add the env vars below (or just leave them unset to point at the same
   shared OnlyMonkes data everyone else sees — see the next section).
5. Deploy. You'll get your own `*.pages.dev` URL (or attach a custom domain).

By default your fork reads/writes the **same shared Saga Monkes community
data** as the official site (`monke-globe.pages.dev`) — same worker, same
locations, same events. That's usually what you want: more front-ends on one
shared community map, not a fragmented copy per fork. If you want a fully
independent instance instead (your own data, isolated from everyone else's),
you'd need to deploy your own copy of `worker-actions` (in the main
OnlyMonkes repo) and point `NEXT_PUBLIC_WORKER_BASE_URL` at it.

## Environment variables

Copy `.env.example` to `.env.local` for local dev:

```
NEXT_PUBLIC_WORKER_BASE_URL=https://onlymonkes-actions.jumpstreet25.workers.dev
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

The RPC URL is only used for client-side wallet connection — get a free key
from Helius or similar if the public endpoint rate-limits you during testing.

## Local development

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # static export to out/
```

## Project structure

- `app/globe` — the 3D globe (`react-globe.gl`), PFP markers for holder
  locations + pins for events.
- `app/events` — event list, detail + RSVP (`app/events/detail`, reads an
  `?id=` query param rather than a dynamic route segment — required for a
  fully static export, since event IDs don't exist at build time), and
  create-event form (`app/events/new`).
- `app/share-location` — set your own public pin.
- `lib/communityApi.ts` — the only file that talks to the worker API. Also
  documents the exact wallet-signature message format the backend expects.
- `worker-actions/src/community.ts` (in the main OnlyMonkes repo) — the
  actual backend: KV-backed storage, signature verification, on-chain Saga
  Monke ownership checks.

## Known gaps (2026-08-26, phase 1)

- The OnlyMonkes app doesn't push real location/event data into this backend
  yet — it was built and deployed with working endpoints, but nothing feeds
  them automatically. Locations/events currently only appear here if someone
  submits them through this site.
- `npm audit` reports vulnerabilities entirely inside `@solana/wallet-adapter-*`'s
  transitive dependency tree (a known characteristic of that package family,
  not something introduced here) — `npm audit fix` doesn't resolve them
  without forcing major version bumps that risk breaking wallet compatibility.
  Left as-is; revisit if the wallet-adapter ecosystem cleans this up upstream.
