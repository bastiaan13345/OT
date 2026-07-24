import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

import { UploadStudio } from "./UploadStudio";
import type { UploadStudioData } from "@/lib/upload/types";

const fixtureData: UploadStudioData = {
  concurrency: 2,
  suggestions: { artist: [], genre: [], tags: [], license: [], album: [] },
  presets: [],
};

beforeEach(() => {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob://mock");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("UploadStudio", () => {
  it("renders single track mode by default", () => {
    render(<UploadStudio initialData={fixtureData} />);
    expect(screen.getByRole("button", { name: /single track/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create album/i })).toBeInTheDocument();
  });

  it("switches to album mode and accepts multiple audio files", async () => {
    const user = userEvent.setup();
    render(<UploadStudio initialData={fixtureData} />);
    await user.click(screen.getByRole("button", { name: "Create album" }));
    const input = screen.getByLabelText(/add audio files/i);
    await user.upload(input, [
      new File(["a"], "01 - First.mp3", { type: "audio/mpeg" }),
      new File(["b"], "02 - Second.mp3", { type: "audio/mpeg" }),
    ]);
    expect(screen.getByDisplayValue("First")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Second")).toBeInTheDocument();
  });

  it("keeps a successful row and offers retry for a failed row", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ releaseId: "r1", coverUrl: "/cover.jpg" }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ trackId: "t1" }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Bad audio" }), { status: 400 }),
      );

    render(<UploadStudio initialData={fixtureData} />);
    await user.click(screen.getByRole("button", { name: "Create album" }));
    await user.type(screen.getByRole("textbox", { name: /album title/i }), "Afterglow Archive");
    await user.upload(screen.getByLabelText(/add audio files/i), [
      new File(["a"], "01 - First.mp3", { type: "audio/mpeg" }),
      new File(["b"], "02 - Second.mp3", { type: "audio/mpeg" }),
    ]);
    await screen.findByDisplayValue("First");
    await user.click(screen.getByRole("button", { name: /create album & upload/i }));

    expect(await screen.findByText("Uploaded")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows an error when release creation fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Server error" }), { status: 500 }),
    );

    render(<UploadStudio initialData={fixtureData} />);
    await user.click(screen.getByRole("button", { name: "Create album" }));
    await user.type(screen.getByRole("textbox", { name: /album title/i }), "Test Album");
    await user.upload(screen.getByLabelText(/add audio files/i), [
      new File(["a"], "01 - Track One.mp3", { type: "audio/mpeg" }),
    ]);
    await screen.findByDisplayValue("Track One");

    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Server error" }), { status: 500 }),
    );

    await user.click(screen.getByRole("button", { name: /create album & upload/i }));
    expect(await screen.findByText(/server error/i)).toBeInTheDocument();
  });
});
