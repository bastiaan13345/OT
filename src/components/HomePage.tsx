import Link from "next/link";
import { ArrowRight, Clock3, Library, ListMusic, Radio, Sparkles } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { AlbumCarousel } from "@/components/home/AlbumCarousel";
import type { Track } from "@prisma/client";

interface HomePageProps { featuredTracks: Track[]; recentTracks: Track[]; stats: { tracks: number; plays: number; artists: number } }

export default function HomePage({ featuredTracks, recentTracks, stats }: HomePageProps) {
  const carouselTracks = [...featuredTracks, ...recentTracks]
    .filter((track, index, tracks) => tracks.findIndex((item) => item.id === track.id) === index)
    .slice(0, 7);
  return <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">
    <header className="mb-12 flex items-end justify-between border-b border-line pb-5">
      <div><p className="mb-1 text-sm text-muted">Listen now</p><h1 className="text-4xl font-semibold tracking-[-0.045em] text-ink sm:text-6xl">Home</h1></div>
      <Link href="/browse" className="hidden items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 text-sm text-ink transition hover:border-ink hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 sm:flex"><Sparkles className="h-4 w-4" /> Discover something new</Link>
    </header>

    <AlbumCarousel tracks={carouselTracks} />

    <section className="mt-14"><div className="mb-5 flex items-center justify-between"><h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Recently Added <ArrowRight className="h-6 w-6 text-faint" /></h2><Link href="/browse?sort=recent" className="rounded-sm text-sm text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">See All</Link></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{recentTracks.map(track => <TrackCard key={track.id} track={track} queue={recentTracks} sourceLabel="Recently Added" />)}</div></section>

    <section className="mt-14"><h2 className="mb-5 text-2xl font-semibold tracking-tight text-ink">Your music, one place</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      { href: "/library", icon: Library, title: "Your Library", copy: "Liked songs and saved music" },
      { href: "/history", icon: Clock3, title: "Recently Played", copy: "Continue where you stopped" },
      { href: "/library", icon: ListMusic, title: "All Playlists", copy: "Collections for every mood" },
      { href: "/feed", icon: Radio, title: "Radio & Feed", copy: `${stats.artists} artists sharing new music` },
    ].map(({ href, icon: Icon, title, copy }) => <Link key={title} href={href} className="group flex items-center gap-4 rounded-2xl border border-line bg-canvas p-4 transition hover:border-ink hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft text-ink"><Icon className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-ink">{title}</p><p className="mt-0.5 text-xs text-muted">{copy}</p></div></Link>)}</div></section>
  </div>;
}
