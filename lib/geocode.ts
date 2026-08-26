/** Free, no-API-key geocoding via OpenStreetMap Nominatim — same source the OnlyMonkes app uses. */
export async function geocodeLocation(query: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
    { headers: { "Accept-Language": "en" } },
  );
  if (!res.ok) return null;
  const results = await res.json();
  if (!results?.length) return null;
  const r = results[0];
  return { lat: parseFloat(r.lat), lng: parseFloat(r.lon), label: r.display_name };
}
