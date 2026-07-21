"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { AudioPlayer } from "@/components/player/AudioPlayer";
import type { Track } from "@prisma/client";

interface HomePageProps {
  featuredTracks: Track[];
  recentTracks: Track[];
  stats: {
    tracks: number;
    plays: number;
    artists: number;
  };
}

export default function HomePage({ featuredTracks, recentTracks, stats }: HomePageProps) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

  return (
    <>
      <div className="mx-auto max-w-7xl px-6">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-300 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Modern music platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 animate-fade-in">
            Share Your Sound
            <br />
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
              With The World
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 animate-slide-up">
            Upload, manage, and share your music with a modern platform designed for independent artists and producers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-slide-up">
            <Link
              href="/browse"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 transition-all hover:scale-105"
            >
              <Play className="h-5 w-5 fill-current" />
              Explore Music
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Upload Your Track
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>

        {/* Featured Tracks */}
        {featuredTracks.length > 0 && (
          <section className="py-16">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/10">
                  <TrendingUp className="h-5 w-5 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Featured Tracks</h2>
                  <p className="text-sm text-zinc-500">Handpicked by our curators</p>
                </div>
              </div>
              <Link
                href="/browse"
                className="text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
              >
                View all
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  onPlay={setCurrentTrack}
                />
              ))}
            </div>
          </section>
        )}

        {/* Recent Uploads */}
        {recentTracks.length > 0 && (
          <section className="py-16">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Recent Uploads</h2>
              <p className="text-sm text-zinc-500">Fresh tracks from our community</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  onPlay={setCurrentTrack}
                />
              ))}
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="py-16 border-y border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: "Tracks Uploaded", value: String(stats.tracks) },
              { label: "Total Plays", value: String(stats.plays) },
              { label: "Active Artists", value: String(stats.artists) },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-sm text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AudioPlayer track={currentTrack} />
    </>
  );
}
