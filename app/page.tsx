import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold mb-4">🐒 MonkeGlobe</h1>
      <p className="text-white/60 mb-10">
        Saga Monkes, worldwide. See where the community is, find meetups, and RSVP —
        powered by the same OnlyMonkes community backend real holders already use in-app.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link href="/globe" className="bg-purple-600 hover:bg-purple-500 rounded-full px-6 py-3">
          🌍 View the Globe
        </Link>
        <Link href="/events" className="bg-white/10 hover:bg-white/20 rounded-full px-6 py-3">
          📅 Events
        </Link>
      </div>
    </div>
  );
}
