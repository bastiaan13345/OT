"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { AlertCircle, ListMusic, Loader2, Maximize2, MessageCircle, Minimize2, Pause, Play, Send, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import type { Track } from "@prisma/client";
import { addComment } from "@/lib/actions";
import { cn, formatDuration } from "@/lib/utils";
import { usePlayer } from "@/components/providers/PlayerProvider";

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
  const track = player.currentTrack;
  if (!track) return null;
  const progress = player.duration ? (player.currentTime / player.duration) * 100 : 0;

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
    <div className="fixed inset-x-3 bottom-3 z-50 sm:left-1/2 sm:right-auto sm:w-[min(720px,calc(100vw-2rem))] sm:-translate-x-1/2">
      {player.error && <div className="mb-2 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 shadow-lg shadow-black/10"><AlertCircle className="h-4 w-4" />{player.error}</div>}
      {commentOpen && <form onSubmit={submitComment} className="mb-2 flex items-center gap-2 rounded-2xl border border-line bg-white/95 p-2 shadow-2xl shadow-black/10 backdrop-blur-2xl">
        <span className="rounded-full bg-soft px-2.5 py-1 text-xs font-semibold tabular-nums text-ink">@ {formatDuration(Math.floor(player.currentTime))}</span>
        <input autoFocus value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment on this moment…" maxLength={500} className="min-w-0 flex-1 bg-transparent px-2 text-sm text-ink outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-ink/15" />
        {commentState === "saved" && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-800">Added</span>}
        {commentState === "error" && <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-800">Sign in to comment</span>}
        <button type="submit" aria-label="Post timestamped comment" disabled={commentState === "saving"} className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50">{commentState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
      </form>}
      <div className="overflow-hidden rounded-[1.35rem] border border-line bg-white/95 shadow-2xl shadow-black/10 backdrop-blur-2xl">
        <div className="h-1 bg-soft"><div className="h-full bg-ink transition-[width]" style={{ width: `${progress}%` }} /></div>
        <div className="flex items-center gap-2 p-2 sm:gap-3">
          <Cover track={track} className="h-12 w-12 sm:h-14 sm:w-14" />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{track.title}</p><p className="truncate text-xs text-muted">{track.artist} · {formatDuration(Math.floor(player.currentTime))}</p></div>
          <div className="flex items-center">
            <IconButton label="Previous track" onClick={player.previousTrack} className="hidden sm:flex"><SkipBack className="h-4 w-4 fill-current" /></IconButton>
            <button type="button" onClick={player.togglePlay} aria-label={player.isPlaying ? "Pause" : "Play"} className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white transition hover:scale-105 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">{player.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : player.isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}</button>
            <IconButton label="Next track" onClick={player.nextTrack}><SkipForward className="h-4 w-4 fill-current" /></IconButton>
          </div>
          <div className="flex items-center">
            <IconButton label="Comment at current timestamp" active={commentOpen} onClick={() => setCommentOpen((v) => !v)}><MessageCircle className="h-4 w-4" /></IconButton>
            <IconButton label={player.muted ? "Unmute" : "Mute"} onClick={player.toggleMute} className="hidden sm:flex">{player.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</IconButton>
          </div>
          <IconButton label={player.queueOpen ? "Hide queue window" : "Show queue window"} active={player.queueOpen} onClick={player.queueOpen ? player.closeQueue : player.openQueue}><ListMusic className="h-4 w-4" /></IconButton>
          <IconButton label="Close player" onClick={player.closePlayer} className="hidden sm:flex"><X className="h-4 w-4" /></IconButton>
        </div>
        <input type="range" min={0} max={player.duration || 0} step={0.1} value={Math.min(player.currentTime, player.duration || player.currentTime)} onChange={(e) => player.seek(Number(e.target.value))} aria-label="Seek playback" className="absolute inset-x-0 top-0 h-2 w-full cursor-pointer opacity-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink" />
      </div>
    </div>
    <QueueWindow />
  </>;
}

function QueueWindow() {
  const player = usePlayer();
  const [expanded, setExpanded] = useState(false);
  if (!player.queueOpen || !player.currentTrack) return null;
  return <aside className={cn("fixed z-40 flex flex-col overflow-hidden border border-line bg-white/95 shadow-2xl shadow-black/10 backdrop-blur-2xl transition-all", expanded ? "inset-3 bottom-24 rounded-3xl sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[min(70vh,680px)] sm:w-[420px]" : "bottom-24 right-3 h-[360px] w-[min(360px,calc(100vw-1.5rem))] rounded-2xl sm:right-5") }>
    <div className="flex items-center justify-between border-b border-line px-4 py-3"><div><h2 className="text-sm font-semibold text-ink">Up Next</h2><p className="text-xs text-muted">{player.queue.length} tracks · {player.sourceLabel}</p></div><div className="flex"><IconButton label={expanded ? "Use mini queue window" : "Expand queue window"} onClick={() => setExpanded(v => !v)}>{expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</IconButton><IconButton label="Close queue" onClick={player.closeQueue}><X className="h-4 w-4" /></IconButton></div></div>
    <div className="flex-1 overflow-y-auto p-2">{player.queue.map((track, index) => { const active = track.id === player.currentTrack?.id; return <div key={`${track.id}-${index}`} className={cn("group flex items-center gap-3 rounded-xl p-2", active ? "bg-soft" : "hover:bg-panel")}><button type="button" onClick={() => player.selectQueueTrack(index)} aria-label={`Play ${track.title}`} className={cn("flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink", active && "border-ink bg-ink text-white")}>{active && player.isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}</button><Cover track={track} className="h-11 w-11" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{track.title}</p><p className="truncate text-xs text-muted">{track.artist}</p></div><IconButton label={`Remove ${track.title} from queue`} onClick={() => player.removeFromQueue(track.id)} className="opacity-60 group-hover:opacity-100"><X className="h-4 w-4" /></IconButton></div>})}</div>
  </aside>;
}

export function AudioPlayer() { return <PlayerBar />; }
