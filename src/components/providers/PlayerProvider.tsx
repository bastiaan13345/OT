"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Track } from "@prisma/client";
import { PlayerBar } from "@/components/player/AudioPlayer";

type RepeatMode = "off" | "all" | "one";

export type PlayerSource = {
  label: string;
  url?: string;
};

type PlaybackContext = {
  queue: Track[];
  source: PlayerSource;
  startIndex: number;
};

type PlaybackPayload = {
  playbackId: string;
  trackId: string;
  source: string;
  playedSeconds: number;
  completed: boolean;
};

type PlayerContextValue = {
  currentTrack: Track | null;
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  queueOpen: boolean;
  sourceLabel: string;
  playTrack: (track: Track, context?: Partial<PlaybackContext>) => void;
  playQueue: (queue: Track[], context?: Partial<Omit<PlaybackContext, "queue">>) => void;
  togglePlay: () => void;
  pause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  closePlayer: () => void;
  openQueue: () => void;
  closeQueue: () => void;
  removeFromQueue: (trackId: string) => void;
  selectQueueTrack: (index: number) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);
const REPORT_INTERVAL_MS = 15_000;
const MIN_REPORT_DELTA = 8;

function createPlaybackId() {
  if (typeof window !== "undefined" && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `playback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getDefaultSource(label?: string) {
  return label && label.trim() ? label.trim() : "Infini";
}

function telemetrySource(label: string) {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes("playlist")) return "playlist";
  if (normalized.includes("following") || normalized.includes("feed")) return "feed";
  if (normalized.includes("history")) return "history";
  if (normalized.includes("browse")) return "browse";
  if (normalized.includes("track:")) return "track-page";
  if (normalized.includes("release")) return "release";
  if (normalized.includes("featured") || normalized.includes("recent")) return "home";
  return "web";
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackContextRef = useRef<PlaybackContext | null>(null);
  const playbackIdRef = useRef<string | null>(null);
  const reportTimerRef = useRef<number | null>(null);
  const lastReportedSecondsRef = useRef(0);
  const listenedSecondsRef = useRef(0);
  const lastAudioTimeRef = useRef(0);
  const currentTrackRef = useRef<Track | null>(null);
  const currentIndexRef = useRef(0);
  const queueRef = useRef<Track[]>([]);
  const shuffleRef = useRef(false);
  const repeatModeRef = useRef<RepeatMode>("off");
  const mutedRef = useRef(false);
  const volumeRef = useRef(0.85);
  const pendingAutoplayRef = useRef(false);

  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [queueOpen, setQueueOpen] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("Infini");

  const currentTrack = queue[currentIndex] ?? null;

  const syncPlaybackState = useCallback(
    (nextQueue: Track[], nextIndex: number, source: string) => {
      queueRef.current = nextQueue;
      currentIndexRef.current = nextIndex;
      currentTrackRef.current = nextQueue[nextIndex] ?? null;
      playbackContextRef.current = {
        queue: nextQueue,
        startIndex: nextIndex,
        source: { label: source },
      };
      setQueue(nextQueue);
      setCurrentIndex(nextIndex);
      setSourceLabel(source);
    },
    []
  );

  const clearReportTimer = useCallback(() => {
    if (reportTimerRef.current !== null) {
      window.clearTimeout(reportTimerRef.current);
      reportTimerRef.current = null;
    }
  }, []);

  const reportPlayback = useCallback(
    async (completed: boolean, forcedSeconds?: number, force = false) => {
      const track = currentTrackRef.current;
      const playbackId = playbackIdRef.current;
      if (!track || !playbackId) return;

      const playedSeconds = Math.max(
        0,
        Math.floor(forcedSeconds ?? listenedSecondsRef.current)
      );
      if (!force && !completed && playedSeconds - lastReportedSecondsRef.current < MIN_REPORT_DELTA) {
        return;
      }

      lastReportedSecondsRef.current = playedSeconds;
      const payload: PlaybackPayload = {
        playbackId,
        trackId: track.id,
        source: telemetrySource(
          playbackContextRef.current?.source.label ?? "Infini"
        ),
        playedSeconds,
        completed,
      };

      try {
        await fetch("/api/playback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch {
        // Best-effort telemetry only.
      }
    },
    []
  );

  const scheduleProgressReport = useCallback(() => {
    clearReportTimer();
    reportTimerRef.current = window.setTimeout(() => {
      void reportPlayback(false);
      scheduleProgressReport();
    }, REPORT_INTERVAL_MS);
  }, [clearReportTimer, reportPlayback]);

  const loadTrack = useCallback(
    async (track: Track, autoplay: boolean) => {
      const audio = audioRef.current;
      if (!audio) return;

      setError(null);
      setIsLoading(true);
      pendingAutoplayRef.current = autoplay;
      audio.src = `/api/tracks/${track.id}/stream`;
      audio.load();
      try {
        if (autoplay) {
          await audio.play();
          pendingAutoplayRef.current = false;
        }
      } catch (err) {
        pendingAutoplayRef.current = false;
        setError(err instanceof Error ? err.message : "Playback failed.");
      }
    },
    []
  );

  const startQueue = useCallback(
    (nextQueue: Track[], startIndex: number, source: string, autoplay = true) => {
      if (!nextQueue.length) return;

      void reportPlayback(false, listenedSecondsRef.current, true);
      const normalizedIndex = Math.min(Math.max(startIndex, 0), nextQueue.length - 1);
      const nextTrack = nextQueue[normalizedIndex];
      playbackIdRef.current = createPlaybackId();
      lastReportedSecondsRef.current = 0;
      listenedSecondsRef.current = 0;
      lastAudioTimeRef.current = 0;
      syncPlaybackState(nextQueue, normalizedIndex, source);
      void loadTrack(nextTrack, autoplay);
      setQueueOpen(true);
    },
    [loadTrack, reportPlayback, syncPlaybackState]
  );

  const playQueue = useCallback(
    (nextQueue: Track[], context?: Partial<Omit<PlaybackContext, "queue">>) => {
      const source = getDefaultSource(context?.source?.label);
      startQueue(nextQueue, context?.startIndex ?? 0, source, true);
    },
    [startQueue]
  );

  const playTrack = useCallback(
    (track: Track, context?: Partial<PlaybackContext>) => {
      const nextQueue = context?.queue?.length ? context.queue : [track];
      const startIndex = context?.queue?.length
        ? Math.max(0, context.startIndex ?? context.queue.findIndex((item) => item.id === track.id))
        : 0;
      const source = getDefaultSource(context?.source?.label);
      startQueue(nextQueue, startIndex < 0 ? 0 : startIndex, source, true);
    },
    [startQueue]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrackRef.current) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = Math.min(Math.max(seconds, 0), Number.isFinite(audio.duration) ? audio.duration : seconds);
    setCurrentTime(audio.currentTime);
    lastAudioTimeRef.current = audio.currentTime;
  }, []);

  const nextTrack = useCallback(() => {
    const trackQueue = queueRef.current;
    if (!trackQueue.length) return;

    void reportPlayback(false, listenedSecondsRef.current, true);
    const nextIndex = (() => {
      if (shuffleRef.current && trackQueue.length > 1) {
        let candidate = currentIndexRef.current;
        while (candidate === currentIndexRef.current) {
          candidate = Math.floor(Math.random() * trackQueue.length);
        }
        return candidate;
      }

      const sequential = currentIndexRef.current + 1;
      if (sequential < trackQueue.length) return sequential;
      return repeatModeRef.current === "all" ? 0 : currentIndexRef.current;
    })();

    if (nextIndex === currentIndexRef.current && repeatModeRef.current !== "one") {
      setIsPlaying(false);
      audioRef.current?.pause();
      return;
    }

    playbackIdRef.current = createPlaybackId();
    lastReportedSecondsRef.current = 0;
    listenedSecondsRef.current = 0;
    lastAudioTimeRef.current = 0;
    currentIndexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
    currentTrackRef.current = trackQueue[nextIndex] ?? null;
    const nextTrackItem = trackQueue[nextIndex];
    if (nextTrackItem) {
      void loadTrack(nextTrackItem, true);
    }
  }, [loadTrack, reportPlayback]);

  const previousTrack = useCallback(() => {
    const trackQueue = queueRef.current;
    if (!trackQueue.length) return;

    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      lastAudioTimeRef.current = 0;
      return;
    }

    let nextIndex =
      shuffleRef.current && trackQueue.length > 1
        ? currentIndexRef.current
        : Math.max(0, currentIndexRef.current - 1);

    while (shuffleRef.current && trackQueue.length > 1 && nextIndex === currentIndexRef.current) {
      nextIndex = Math.floor(Math.random() * trackQueue.length);
    }

    void reportPlayback(false, listenedSecondsRef.current, true);
    playbackIdRef.current = createPlaybackId();
    lastReportedSecondsRef.current = 0;
    listenedSecondsRef.current = 0;
    lastAudioTimeRef.current = 0;
    currentIndexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
    currentTrackRef.current = trackQueue[nextIndex] ?? null;
    const nextTrackItem = trackQueue[nextIndex];
    if (nextTrackItem) {
      void loadTrack(nextTrackItem, true);
    }
  }, [loadTrack, reportPlayback]);

  const closePlayer = useCallback(() => {
    void reportPlayback(false, listenedSecondsRef.current, true);
    audioRef.current?.pause();
    audioRef.current?.removeAttribute("src");
    audioRef.current?.load();
    playbackIdRef.current = null;
    currentTrackRef.current = null;
    playbackContextRef.current = null;
    queueRef.current = [];
    setQueue([]);
    setCurrentIndex(0);
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setQueueOpen(false);
  }, [reportPlayback]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    audio.muted = nextMuted;
  }, []);

  const setVolume = useCallback((nextVolume: number) => {
    const normalized = Math.min(1, Math.max(0, nextVolume));
    volumeRef.current = normalized;
    setVolumeState(normalized);
    if (normalized > 0 && mutedRef.current) {
      mutedRef.current = false;
      setMuted(false);
    }
    if (audioRef.current) {
      audioRef.current.volume = normalized;
      audioRef.current.muted = mutedRef.current;
    }
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((value) => {
      shuffleRef.current = !value;
      return !value;
    });
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((value) => {
      const next = value === "off" ? "all" : value === "all" ? "one" : "off";
      repeatModeRef.current = next;
      return next;
    });
  }, []);

  const removeFromQueue = useCallback((trackId: string) => {
    setQueue((prev) => {
      const next = prev.filter((track) => track.id !== trackId);
      queueRef.current = next;
      if (!next.length) {
        setCurrentIndex(0);
        currentIndexRef.current = 0;
        currentTrackRef.current = null;
        audioRef.current?.pause();
        return next;
      }

      const currentTrackId = currentTrackRef.current?.id;
      if (currentTrackId === trackId) {
        const nextIndex = Math.min(currentIndexRef.current, next.length - 1);
        currentIndexRef.current = nextIndex;
        setCurrentIndex(nextIndex);
        currentTrackRef.current = next[nextIndex];
        void loadTrack(next[nextIndex], true);
      } else {
        const newIndex = next.findIndex((track) => track.id === currentTrackId);
        if (newIndex >= 0 && newIndex !== currentIndexRef.current) {
          currentIndexRef.current = newIndex;
          setCurrentIndex(newIndex);
        } else if (currentIndexRef.current >= next.length) {
          currentIndexRef.current = next.length - 1;
          setCurrentIndex(next.length - 1);
        }
      }

      return next;
    });
  }, [loadTrack]);

  const selectQueueTrack = useCallback(
    (index: number) => {
      const trackQueue = queueRef.current;
      if (index < 0 || index >= trackQueue.length) return;
      if (index === currentIndexRef.current) {
        togglePlay();
        return;
      }

      void reportPlayback(false, listenedSecondsRef.current, true);
      playbackIdRef.current = createPlaybackId();
      lastReportedSecondsRef.current = 0;
      listenedSecondsRef.current = 0;
      lastAudioTimeRef.current = 0;
      currentIndexRef.current = index;
      currentTrackRef.current = trackQueue[index];
      setCurrentIndex(index);
      void loadTrack(trackQueue[index], true);
    },
    [loadTrack, reportPlayback, togglePlay]
  );

  const openQueue = useCallback(() => setQueueOpen(true), []);
  const closeQueue = useCallback(() => setQueueOpen(false), []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = volumeRef.current;
    audio.muted = mutedRef.current;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      const delta = audio.currentTime - lastAudioTimeRef.current;
      if (delta > 0 && delta < 2) {
        listenedSecondsRef.current += delta;
      }
      lastAudioTimeRef.current = audio.currentTime;
      setCurrentTime(audio.currentTime);
    };
    const handleDurationChange = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
      scheduleProgressReport();
    };
    const handlePause = () => {
      setIsPlaying(false);
      clearReportTimer();
      void reportPlayback(false, listenedSecondsRef.current, true);
    };
    const handleEnded = () => {
      clearReportTimer();
      void reportPlayback(true, listenedSecondsRef.current);
      if (repeatModeRef.current === "one") {
        playbackIdRef.current = createPlaybackId();
        lastReportedSecondsRef.current = 0;
        listenedSecondsRef.current = 0;
        lastAudioTimeRef.current = 0;
        audio.currentTime = 0;
        void audio.play();
        return;
      }
      nextTrack();
    };
    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setError("Unable to load audio.");
      clearReportTimer();
    };
    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };
    const handleCanPlay = () => {
      setIsLoading(false);
      if (pendingAutoplayRef.current) {
        pendingAutoplayRef.current = false;
        void audio.play();
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      clearReportTimer();
      void reportPlayback(false, listenedSecondsRef.current, true);
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audioRef.current = null;
    };
  }, [clearReportTimer, nextTrack, reportPlayback, scheduleProgressReport]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
    volumeRef.current = volume;
    mutedRef.current = muted;
  }, [muted, volume]);

  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    const handlePageHide = () => {
      void reportPlayback(false, listenedSecondsRef.current, true);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        void reportPlayback(false, listenedSecondsRef.current, true);
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [reportPlayback]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTyping =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable;

      if (isTyping) return;

      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        seek(Math.min((audioRef.current?.currentTime ?? 0) + 10, audioRef.current?.duration ?? Number.MAX_SAFE_INTEGER));
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        seek(Math.max((audioRef.current?.currentTime ?? 0) - 10, 0));
      } else if (event.key.toLowerCase() === "m") {
        toggleMute();
      } else if (event.key.toLowerCase() === "s") {
        toggleShuffle();
      } else if (event.key.toLowerCase() === "r") {
        cycleRepeat();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cycleRepeat, seek, toggleMute, togglePlay, toggleShuffle]);

  useEffect(() => {
    if (!currentTrack) return;
    if (!playbackIdRef.current) {
      playbackIdRef.current = createPlaybackId();
    }
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack) return;
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    const mediaSession = navigator.mediaSession;
    if (!mediaSession) return;

    mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album ?? "Infini",
      artwork: currentTrack.coverUrl
        ? [{ src: currentTrack.coverUrl, sizes: "512x512", type: "image/jpeg" }]
        : undefined,
    });

    mediaSession.setActionHandler("play", togglePlay);
    mediaSession.setActionHandler("pause", togglePlay);
    mediaSession.setActionHandler("previoustrack", previousTrack);
    mediaSession.setActionHandler("nexttrack", nextTrack);
    mediaSession.setActionHandler("seekto", (details) => {
      if (typeof details.seekTime === "number") seek(details.seekTime);
    });

    return () => {
      mediaSession.setActionHandler("play", null);
      mediaSession.setActionHandler("pause", null);
      mediaSession.setActionHandler("previoustrack", null);
      mediaSession.setActionHandler("nexttrack", null);
      mediaSession.setActionHandler("seekto", null);
    };
  }, [currentTrack, nextTrack, previousTrack, seek, togglePlay]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      currentTrack,
      queue,
      currentIndex,
      isPlaying,
      isLoading,
      error,
      currentTime,
      duration,
      volume,
      muted,
      shuffle,
      repeatMode,
      queueOpen,
      sourceLabel,
      playTrack,
      playQueue,
      togglePlay,
      pause,
      nextTrack,
      previousTrack,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      closePlayer,
      openQueue,
      closeQueue,
      removeFromQueue,
      selectQueueTrack,
    }),
    [
      closePlayer,
      closeQueue,
      currentIndex,
      currentTrack,
      currentTime,
      cycleRepeat,
      duration,
      error,
      isLoading,
      isPlaying,
      muted,
      nextTrack,
      pause,
      playQueue,
      playTrack,
      previousTrack,
      queue,
      queueOpen,
      removeFromQueue,
      selectQueueTrack,
      repeatMode,
      seek,
      setVolume,
      shuffle,
      sourceLabel,
      toggleMute,
      togglePlay,
      toggleShuffle,
      volume,
      openQueue,
    ]
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <PlayerBar />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return context;
}
