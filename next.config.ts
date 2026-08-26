import type { NextConfig } from "next";

// Static export — deploys as plain HTML/JS/CSS to Cloudflare Pages (or any
// static host). All dynamic data (locations, events, RSVPs) is fetched
// client-side from the OnlyMonkes worker API at runtime, never rendered at
// build time — see lib/communityApi.ts. This is what makes "fork the repo,
// point a Pages project at it" work with zero server runtime to configure.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true }, // next/image's optimizer needs a server; not available in static export
};

export default nextConfig;
