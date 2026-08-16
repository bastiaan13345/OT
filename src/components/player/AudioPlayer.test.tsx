import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addComment: vi.fn(),
  usePlayer: vi.fn(),
}));

vi.mock("@/lib/actions", () => ({ addComment: mocks.addComment }));
vi.mock("@/components/providers/PlayerProvider", () => ({ usePlayer: mocks.usePlayer }));

import { PlayerBar } from "./AudioPlayer";

const player = {
  closePlayer: vi.fn(),
  closeQueue: vi.fn(),
  currentTime: 42,
  currentTrack: {
    album: null,
    artist: "Northstar",
    coverUrl: null,
    id: "track-1",
    title: "Signal Path",
  },
  duration: 180,
  error: null,
  isLoading: false,
  isPlaying: false,
  muted: false,
  nextTrack: vi.fn(),
  openQueue: vi.fn(),
  previousTrack: vi.fn(),
  queue: [],
  queueOpen: false,
  removeFromQueue: vi.fn(),
  seek: vi.fn(),
  selectQueueTrack: vi.fn(),
  sourceLabel: "Featured",
  toggleMute: vi.fn(),
  togglePlay: vi.fn(),
};

describe("PlayerBar layout controls", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.usePlayer.mockReturnValue(player);
  });

  it("uses a compact layout and saves that preference", async () => {
    const user = userEvent.setup();
    const { container } = render(<PlayerBar />);

    await user.click(screen.getByRole("button", { name: "Use compact player" }));

    expect(container.querySelector("[data-player-size]")).toHaveAttribute("data-player-size", "compact");
    expect(localStorage.getItem("infini-player-size")).toBe("compact");
    expect(screen.getByRole("button", { name: "Use standard player" })).toBeInTheDocument();
  });

  it("cycles through right and left desktop positions and saves them", async () => {
    const user = userEvent.setup();
    const { container } = render(<PlayerBar />);
    const playerRoot = container.querySelector("[data-player-position]");

    await user.click(screen.getByRole("button", { name: "Player is center; move to right" }));
    expect(playerRoot).toHaveAttribute("data-player-position", "right");
    expect(localStorage.getItem("infini-player-position")).toBe("right");

    await user.click(screen.getByRole("button", { name: "Player is right; move to left" }));
    expect(playerRoot).toHaveAttribute("data-player-position", "left");
    expect(localStorage.getItem("infini-player-position")).toBe("left");
  });
});
