/**
 * globe.onlymonkes.app + monkeglobe.onlymonkes.app → the public MonkeGlobe site
 * (Cloudflare Pages project monke-globe). Pages custom domains can't be added from
 * wrangler, so this Worker serves the same pages on the friendly addresses.
 */
const ORIGIN = "https://monke-globe.pages.dev";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const res = await fetch(new Request(ORIGIN + url.pathname + url.search, request));
    const headers = new Headers(res.headers);
    const loc = headers.get("location");
    if (loc?.startsWith(ORIGIN)) headers.set("location", loc.replace(ORIGIN, url.origin));
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
};
