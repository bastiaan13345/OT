"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { AlignCenter, AlignLeft, AlignRight, AlertCircle, ListMusic, Loader2, Maximize2, MessageCircle, Minimize2, Pause, Play, Send, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import type { Track } from "@prisma/client";
import { addComment } from "@/lib/actions";
import { cn, formatDuration } from "@/lib/utils";
import { usePlayer } from "@/components/providers/PlayerProvider";

type PlayerSize = "standard" | "compact";
type PlayerPosition = "left" | "center" | "right";

const PLAYER_SIZE_KEY = "infini-player-size";
const PLAYER_POSITION_KEY = "infini-player-position";
const positions: PlayerPosition[] = ["left", "center", "right"];

function IconButton({ label, active, onClick, children, className }: { label: string; active?: boolean; onClick?: () => void; children: React.ReactNode; className?: string }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={cn("flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink", active && "bg-soft text-ink", className)}>{children}</button>;
}

function Cover({ track, className }: { track: Track; className?: string }) {
  return <div className={cn("relative shrink-0 overflow-hidden rounded-xl bg-soft", className)}>{track.coverUrl ? <Image src={track.coverUrl} alt="" fill className="object-cover" sizes="80px" /> : <div className="flex h-full items-center justify-center text-faint">♫</div>}</div>;
}

export function PlayerBar() {
  const player = usePlayer();
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [commentState, setCommentState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [size, setSize] = useState<PlayerSize>("standard");
  const [position, setPosition] = useState<PlayerPosition>("center");

  useEffect(() => {
    const savedSize = localStorage.getItem(PLAYER_SIZE_KEY);
    const savedPosition = localStorage.getItem(PLAYER_POSITION_KEY);
    if (savedSize === "standard" || savedSize === "compact") setSize(savedSize);
    if (savedPosition && positions.includes(savedPosition as PlayerPosition)) {
      setPosition(savedPosition as PlayerPosition);
    }
  }, []);

  const track = player.currentTrack;
  if (!track) return null;
  const progress = player.duration ? (player.currentTime / player.duration) * 100 : 0;
  const compact = size === "compact";
  const nextPosition = positions[(positions.indexOf(position) + 1) % positions.length];
  const PositionIcon = position === "left" ? AlignLeft : position === "right" ? AlignRight : AlignCenter;

  function toggleSize() {
    const nextSize = compact ? "standard" : "compact";
    setSize(nextSize);
    setCommentOpen(false);
    localStorage.setItem(PLAYER_SIZE_KEY, nextSize);
  }

  function cyclePosition() {
    setPosition(nextPosition);
    localStorage.setItem(PLAYER_POSITION_KEY, nextPosition);
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!track || !comment.trim()) return;
    setCommentState("saving");
    const data = new FormData();
    data.set("body", comment.trim());
    data.set("timestampSeconds", String(Math.floor(player.currentTime)));
    try {
      await addComment(track.id, data);
      setComment("");
      setCommentState("saved");
      window.setTimeout(() => setCommentState("idle"), 1800);
    } catch {
      setCommentState("error");
    }
  }

  return <>
    <div
      data-player-position={position}
      data-player-size={size}
      className={cn(
        "fixed inset-x-3 bottom-3 z-50 transition-[left,right,width,transform] duration-300 sm:left-1/2 sm:right-auto sm:-translate-x-1/2",
        compact ? "sm:w-[340px] md:w-[326px]" : "sm:w-[min(720px,calc(100vw-2rem))] md:w-[min(720px,calc(100vw-18.5rem))]",
        position === "left" && "md:left-[calc(16rem+1.25rem)] md:right-auto md:translate-x-0",
        position === "center" && "md:left-[calc(50%+8rem)] md:right-auto md:-translate-x-1/2",
        position === "right" && "md:left-auto md:right-5 md:translate-x-0",
      )}
    >
      {player.error && <div className="mb-2 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 shadow-lg shadow-black/10"><AlertCircle className="h-4 w-4" />{player.error}</div>}
      {commentOpen && <form onSubmit={submitComment} className="mb-2 flex items-center gap-2 rounded-2xl border border-line bg-canvas/95 p-2 shadow-2xl shadow-black/20 backdrop-blur-2xl">
        <span className="rounded-full bg-soft px-2.5 py-1 text-xs font-semibold tabular-nums text-ink">@ {formatDuration(Math.floor(player.currentTime))}</span>
        <input autoFocus value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment on this moment…" maxLength={500} className="min-w-0 flex-1 bg-transparent px-2 text-sm text-ink outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-ink/15" />
        {commentState === "saved" && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-800">Added</span>}
        {commentState === "error" && <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-800">Sign in to comment</span>}
        <button type="submit" aria-label="Post timestamped comment" disabled={commentState === "saving"} className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-canvas transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50">{commentState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
      </form>}
      <div className={cn("relative overflow-hidden border border-line bg-canvas/95 shadow-2xl shadow-black/20 backdrop-blur-2xl", compact ? "rounded-2xl" : "rounded-[1.35rem]")}>
        <div className="h-1 bg-soft"><div className="h-full bg-ink transition-[width]" style={{ width: `${progress}%` }} /></div>
        <div className={cn("flex items-center", compact ? "gap-1.5 p-1.5" : "gap-2 p-2 sm:gap-3")}>
          <Cover track={track} className={compact ? "h-10 w-10 rounded-lg" : "h-12 w-12 sm:h-14 sm:w-14"} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{track.title}</p>
            <p className="truncate text-xs text-muted">{track.artist} · {formatDuration(Math.floor(player.currentTime))}</p>
          </div>
          {!compact && <div className="flex items-center">
            <IconButton label="Previous track" onClick={player.previousTrack} className="hidden sm:flex"><SkipBack className="h-4 w-4 fill-current" /></IconButton>
            <PlayButton />
            <IconButton label="Next track" onClick={player.nextTrack}><SkipForward className="h-4 w-4 fill-current" /></IconButton>
          </div>}
          {compact && <PlayButton compact />}
          {compact && <IconButton label="Next track" onClick={player.nextTrack} className="h-8 w-8"><SkipForward className="h-3.5 w-3.5 fill-current" /></IconButton>}
          {!compact && <div className="flex items-center">
            <IconButton label="Comment at current timestamp" active={commentOpen} onClick={() => setCommentOpen((v) => !v)}><MessageCircle className="h-4 w-4" /></IconButton>
            <IconButton label={player.muted ? "Unmute" : "Mute"} onClick={player.toggleMute} className="hidden sm:flex">{player.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</IconButton>
          </div>}
          {!compact && <IconButton label={player.queueOpen ? "Hide queue window" : "Show queue window"} active={player.queueOpen} onClick={player.queueOpen ? player.closeQueue : player.openQueue}><ListMusic className="h-4 w-4" /></IconButton>}
          <IconButton label={`Player is ${position}; move to ${nextPosition}`} onClick={cyclePosition} className={cn("hidden md:flex", compact && "h-8 w-8")}><PositionIcon className="h-4 w-4" /></IconButton>
          <IconButton label={compact ? "Use standard player" : "Use compact player"} onClick={toggleSize} className={compact ? "h-8 w-8" : undefined}>{compact ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}</IconButton>
          {!compact && <IconButton label="Close player" onClick={player.closePlayer} className="hidden sm:flex"><X className="h-4 w-4" /></IconButton>}
        </div>
        <input type="range" min={0} max={player.duration || 0} step={0.1} value={Math.min(player.currentTime, player.duration || player.currentTime)} onChange={(e) => player.seek(Number(e.target.value))} aria-label="Seek playback" className="absolute inset-x-0 top-0 h-2 w-full cursor-pointer opacity-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink" />
      </div>
    </div>
    <QueueWindow playerPosition={position} compactPlayer={compact} />
  </>;

  function PlayButton({ compact: small = false }: { compact?: boolean }) {
    return <button type="button" onClick={player.togglePlay} aria-label={player.isPlaying ? "Pause" : "Play"} className={cn("flex shrink-0 items-center justify-center rounded-full bg-ink text-canvas transition hover:scale-105 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2", small ? "h-9 w-9" : "h-11 w-11")}>{player.isLoading ? <Loader2 className={cn("animate-spin", small ? "h-4 w-4" : "h-5 w-5")} /> : player.isPlaying ? <Pause className={cn("fill-current", small ? "h-4 w-4" : "h-5 w-5")} /> : <Play className={cn("ml-0.5 fill-current", small ? "h-4 w-4" : "h-5 w-5")} />}</button>;
  }
}

function QueueWindow({ playerPosition, compactPlayer }: { playerPosition: PlayerPosition; compactPlayer: boolean }) {
  const player = usePlayer();
  const [expanded, setExpanded] = useState(false);
  if (!player.queueOpen || !player.currentTrack) return null;
  return <aside className={cn(
    "fixed z-40 flex flex-col overflow-hidden border border-line bg-canvas/95 shadow-2xl shadow-black/20 backdrop-blur-2xl transition-all",
    expanded
      ? "inset-3 bottom-24 rounded-3xl sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[min(70vh,680px)] sm:w-[420px]"
      : cn("right-3 h-[360px] w-[min(360px,calc(100vw-1.5rem))] rounded-2xl sm:right-5", compactPlayer ? "bottom-20" : "bottom-24", playerPosition === "left" && "md:left-[calc(16rem+1.25rem)] md:right-auto", playerPosition === "center" && "md:left-[calc(50%+8rem)] md:right-auto md:-translate-x-1/2", playerPosition === "right" && "md:left-auto md:right-5 md:translate-x-0"),
  )}>
    <div className="flex items-center justify-between border-b border-line px-4 py-3"><div><h2 className="text-sm font-semibold text-ink">Up Next</h2><p className="text-xs text-muted">{player.queue.length} tracks · {player.sourceLabel}</p></div><div className="flex"><IconButton label={expanded ? "Use mini queue window" : "Expand queue window"} onClick={() => setExpanded(v => !v)}>{expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</IconButton><IconButton label="Close queue" onClick={player.closeQueue}><X className="h-4 w-4" /></IconButton></div></div>
    <div className="flex-1 overflow-y-auto p-2">{player.queue.map((track, index) => { const active = track.id === player.currentTrack?.id; return <div key={`${track.id}-${index}`} className={cn("group flex items-center gap-3 rounded-xl p-2", active ? "bg-soft" : "hover:bg-panel")}><button type="button" onClick={() => player.selectQueueTrack(index)} aria-label={`Play ${track.title}`} className={cn("flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink", active && "border-ink bg-ink text-canvas")}>{active && player.isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}</button><Cover track={track} className="h-11 w-11" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{track.title}</p><p className="truncate text-xs text-muted">{track.artist}</p></div><IconButton label={`Remove ${track.title} from queue`} onClick={() => player.removeFromQueue(track.id)} className="opacity-60 group-hover:opacity-100"><X className="h-4 w-4" /></IconButton></div>})}</div>
  </aside>;
}

export function AudioPlayer() { return <PlayerBar />; }
