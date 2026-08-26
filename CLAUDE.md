@AGENTS.md

# MonkeGlobe — Rules for Claude and Grok

Companion public web repo to [OnlyMonkes](https://github.com/jumpstreet25/OnlyMonkes)
(the mobile app's own `CLAUDE.md` has the full app/bot architecture — this
file only covers what's specific to this repo).

## Architecture

- **Static export only** (`output: "export"` in `next.config.ts`). No server
  runtime, no Next.js API routes, no server components that fetch at request
  time. Every dynamic value is fetched client-side in the browser. This is
  deliberate — it's what makes "fork the repo, point a Pages project at it"
  work with zero backend to stand up. Don't add anything that needs SSR/ISR
  without first checking whether it breaks the static export build.
- Dynamic routes (event IDs) use a query param (`/events/detail?id=`), never
  a Next.js dynamic segment (`/events/[id]`) — a static export can't
  pre-render segments for IDs that don't exist at build time, and
  `dynamicParams: true` requires a server runtime this repo deliberately
  doesn't have.
- All backend logic lives in `worker-actions/src/community.ts` in the
  **main OnlyMonkes repo**, not here — this repo only ever calls it via
  `lib/communityApi.ts`. Never add a backend to this repo.
- Wallet signature message format (`lib/communityApi.ts`'s `signAuth`) MUST
  exactly match what `worker-actions/src/community.ts`'s `verifyCommunityAuth`
  reconstructs: `` `OnlyMonkes Community\n${action}\n${wallet}\n${ts}` ``. If
  you change one side, change the other in the same commit — this isn't
  auto-synced, it's just a convention both files document.
- `@solana/wallet-adapter-wallets` was deliberately NOT installed — modern
  wallets (Phantom, Solflare, Backpack) self-register via the Wallet
  Standard and `@solana/wallet-adapter-react` auto-detects them with an
  empty `wallets={[]}` array. Adding `wallet-adapter-wallets` back in pulls
  a huge legacy dependency tree (old WalletConnect/Ledger chains) and was
  responsible for ~80 of the ~99 `npm audit` findings before it was removed
  (2026-08-26) — don't re-add it without a real reason.

## Data model

- Locations are **public by default** — no opt-in gate. This was an explicit
  product decision (2026-08-26), not an oversight. Don't add a privacy gate
  without checking with the user first — it'd be a real behavior change from
  what's shipped.
- Writes (location, event, RSVP) require BOTH a valid wallet signature AND a
  live on-chain Saga Monke ownership check (`verifySagaOnChain` in the main
  repo's `onchainHolder.ts`) — signing alone is not sufficient authorization.
- The public attendee list (`GET .../rsvps`) only ever returns usernames,
  never wallet addresses. A caller's own RSVP status uses a separate
  endpoint (`GET .../rsvp-status?wallet=`) that only reveals status for the
  wallet the caller already provided — never reuse the public attendee list
  to infer "is this wallet going," it can't (usernames vs. wallet mismatch).

## Deploy

- Production: `wrangler pages deploy out --project-name monke-globe --branch main`
  after `npm run build`. Cloudflare Pages project already exists
  (`monke-globe`, production branch `main`) — this doesn't need recreating.
- The backend (`worker-actions`) deploys independently from the main
  OnlyMonkes repo (`cd worker-actions && npx wrangler deploy`) — changes to
  `community.ts` need a separate deploy from that repo, this repo's deploy
  doesn't touch it.
