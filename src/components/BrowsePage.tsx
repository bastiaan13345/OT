"use client";

import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { TrackCard } from "@/components/TrackCard";
import { AudioPlayer } from "@/components/player/AudioPlayer";
import type { Track } from "@prisma/client";

interface BrowsePageProps {
  tracks: Track[];
}

export default function BrowsePage({ tracks }: BrowsePageProps) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const genres = Array.from(new Set(tracks.map((t) => t.genre).filter(Boolean))) as string[];

  const filteredTracks = tracks.filter((track) => {
    const matchesSearch =
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.genre?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGenre = !selectedGenre || track.genre === selectedGenre;

    return matchesSearch && matchesGenre;
  });

  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Browse Music
          </h1>
          <p className="text-lg text-zinc-400">
            Discover {tracks.length} tracks from independent artists
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search tracks, artists, genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <select
              value={selectedGenre || ""}
              onChange={(e) => setSelectedGenre(e.target.value || null)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
            >
              <option value="">All Genres</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {filteredTracks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredTracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                onPlay={setCurrentTrack}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-white/5 p-6">
              <Search className="h-12 w-12 text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No tracks found
            </h3>
            <p className="text-zinc-500">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      <AudioPlayer track={currentTrack} />
    </>
  );
}
