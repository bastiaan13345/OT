"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Disc3, Pause, Play } from "lucide-react";
import type { Track } from "@prisma/client";
import { usePlayer } from "@/components/providers/PlayerProvider";

export function AlbumCarousel({ tracks }: { tracks: Track[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const player = usePlayer();

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const cards = Array.from(scroller.querySelectorAll<HTMLElement>("[data-carousel-card]"));
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (mostVisible) setActiveIndex(Number((mostVisible.target as HTMLElement).dataset.index));
      },
      { root: scroller, threshold: [0.45, 0.65, 0.85] }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [tracks]);

  const goTo = (index: number) => {
    const normalized = (index + tracks.length) % tracks.length;
    scrollerRef.current
      ?.querySelector<HTMLElement>(`[data-index="${normalized}"]`)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const toggleTrack = (track: Track, index: number) => {
    if (player.currentTrack?.id === track.id) {
      player.togglePlay();
      return;
    }
    player.playTrack(track, {
      queue: tracks,
      startIndex: index,
      source: { label: "Featured carousel" },
    });
  };

  if (!tracks.length) return null;

  return (
    <section className="relative -mx-5 overflow-hidden border-y border-line bg-white py-10 sm:-mx-8 lg:-mx-10 lg:py-14">
      <div className="relative mb-7 flex items-end justify-between px-5 sm:px-8 lg:px-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">On rotation</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
            Records worth stopping for.
          </h2>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button onClick={() => goTo(activeIndex - 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:border-ink hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2" aria-label="Previous album">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button onClick={() => goTo(activeIndex + 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:border-ink hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2" aria-label="Next album">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="carousel-scroll relative flex snap-x snap-mandatory gap-5 overflow-x-auto px-[max(1.25rem,calc((100vw-16rem-93rem)/2))] pb-5 sm:gap-7 sm:px-8 lg:px-10">
        {tracks.map((track, index) => {
          const isPlaying = player.currentTrack?.id === track.id && player.isPlaying;
          return (
            <article key={track.id} data-carousel-card data-index={index} className="carousel-card group relative w-[82vw] max-w-[880px] flex-none snap-center overflow-hidden rounded-[1.75rem] border border-line bg-white shadow-xl shadow-black/10 sm:w-[72vw] lg:w-[62vw]">
              <div className="grid min-h-[390px] md:grid-cols-[1.05fr_0.95fr]">
                <div className="relative aspect-square overflow-hidden bg-soft md:aspect-auto">
                  {track.coverUrl ? (
                    <Image src={track.coverUrl} alt={`${track.title} artwork`} fill sizes="(max-width: 768px) 82vw, 45vw" className="object-cover transition duration-700 ease-out group-hover:scale-[1.035]" priority={index === 0} />
                  ) : (
                    <div className="flex h-full min-h-72 items-center justify-center bg-gradient-to-br from-soft via-zinc-200 to-zinc-400"><Disc3 className="h-24 w-24 text-faint" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent md:hidden" />
                </div>
                <div className="flex flex-col justify-between p-7 sm:p-9 lg:p-11">
                  <div>
                    <div className="mb-10 flex items-center justify-between text-xs font-medium uppercase tracking-[0.16em] text-muted">
                      <span>{String(index + 1).padStart(2, "0")} / {String(tracks.length).padStart(2, "0")}</span>
                      <span>{track.genre || "New release"}</span>
                    </div>
                    <p className="text-sm text-muted">{track.album || "Single"}</p>
                    <Link href={`/track/${track.id}`} className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"><h3 className="mt-2 text-4xl font-semibold leading-[0.95] tracking-[-0.05em] text-ink transition hover:text-black sm:text-5xl lg:text-6xl">{track.title}</h3></Link>
                    <p className="mt-4 text-lg text-muted">{track.artist}</p>
                    {track.description && <p className="mt-6 line-clamp-3 max-w-md text-sm leading-6 text-muted">{track.description}</p>}
                  </div>
                  <div className="mt-10 flex items-center gap-4">
                    <button onClick={() => toggleTrack(track, index)} className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-xl shadow-black/10 transition hover:scale-105 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2" aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}>
                      {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
                    </button>
                    <Link href={`/track/${track.id}`} className="rounded-sm text-sm font-medium text-ink transition hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">View track</Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="relative mt-3 flex justify-center gap-2">
        {tracks.map((track, index) => <button key={track.id} onClick={() => goTo(index)} aria-label={`Go to ${track.title}`} className={`h-1.5 rounded-full transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${activeIndex === index ? "w-9 bg-ink" : "w-2 bg-line hover:bg-muted"}`} />)}
      </div>
    </section>
  );
}
