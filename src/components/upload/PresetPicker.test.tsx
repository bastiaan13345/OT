import { createElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PresetPicker } from "./PresetPicker";
import type { UploadPresetView, UploadValuePatch } from "@/lib/upload/types";

const savedPreset: UploadPresetView = {
  id: "saved-1",
  name: "Saved",
  source: "saved",
  genre: "Ambient",
};

const priorPreset: UploadPresetView = {
  id: "track-1",
  name: "Prior",
  source: "track",
  title: "Old",
};

function openPicker() {
  return userEvent.setup();
}

describe("PresetPicker", () => {
  it("groups saved and previous-track presets, previews title overwrites, and applies only the upload patch", async () => {
    const user = openPicker();
    const onApply = vi.fn();
    render(
      createElement(PresetPicker, {
        current: { title: "Current" },
        onApply,
        presets: [savedPreset, priorPreset],
      }),
    );

    const trigger = screen.getByRole("button", { name: "Choose preset" });
    await user.click(trigger);

    const picker = screen.getByRole("dialog", { name: "Upload presets" });
    expect(picker).toHaveClass("bg-surface-900");
    expect(picker).not.toHaveAttribute("aria-modal");
    expect(trigger).toHaveAttribute("aria-controls", picker.id);
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(within(picker).getByRole("heading", { name: "Saved presets" })).toBeInTheDocument();
    expect(within(picker).getByRole("heading", { name: "Previous tracks" })).toBeInTheDocument();

    await user.click(within(picker).getByRole("button", { name: "Prior" }));

    const confirmation = screen.getByRole("dialog", { name: "Apply Prior preset" });
    expect(within(confirmation).getByText("Title")).toBeInTheDocument();
    expect(within(confirmation).getByText("Current")).toBeInTheDocument();
    expect(within(confirmation).getByText("Old")).toBeInTheDocument();

    await user.click(within(confirmation).getByRole("button", { name: "Apply preset" }));

    expect(onApply).toHaveBeenCalledWith({ title: "Old" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("applies immediately when a preset does not overwrite populated fields", async () => {
    const user = openPicker();
    const onApply = vi.fn();
    render(
      createElement(PresetPicker, {
        current: { title: "Current" },
        onApply,
        presets: [savedPreset],
      }),
    );

    await user.click(screen.getByRole("button", { name: "Choose preset" }));
    await user.click(screen.getByRole("button", { name: "Saved" }));

    expect(onApply).toHaveBeenCalledWith({ genre: "Ambient" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancels an overwrite confirmation without applying or leaving stale dialog state", async () => {
    const user = openPicker();
    const onApply = vi.fn();
    render(
      createElement(PresetPicker, {
        current: { title: "Current" },
        onApply,
        presets: [priorPreset],
      }),
    );

    await user.click(screen.getByRole("button", { name: "Choose preset" }));
    await user.click(screen.getByRole("button", { name: "Prior" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Choose preset" }));
    expect(screen.getByRole("dialog", { name: "Upload presets" })).toBeInTheDocument();
  });

  it("warns about boolean changes and destructive string clears before applying", async () => {
    const user = openPicker();
    const onApply = vi.fn();
    const destructivePreset: UploadPresetView = {
      id: "saved-2",
      name: "Download policy",
      source: "saved",
      allowDownload: true,
      description: "",
    };
    render(
      createElement(PresetPicker, {
        current: { allowDownload: false, description: "Existing description" },
        onApply,
        presets: [destructivePreset],
      }),
    );

    await user.click(screen.getByRole("button", { name: "Choose preset" }));
    await user.click(screen.getByRole("button", { name: "Download policy" }));

    const confirmation = screen.getByRole("dialog", { name: "Apply Download policy preset" });
    expect(within(confirmation).getByText("Allow downloads")).toBeInTheDocument();
    expect(within(confirmation).getByText("Description")).toBeInTheDocument();

    await user.click(within(confirmation).getByRole("button", { name: "Apply preset" }));

    expect(onApply).toHaveBeenCalledWith({ allowDownload: true, description: "" });
  });

  it("never supplies preset metadata to onApply", async () => {
    const user = openPicker();
    const onApply = vi.fn<(patch: UploadValuePatch) => void>();
    const preset: UploadPresetView = {
      id: "track-2",
      name: "Metadata-free patch",
      source: "track",
      genre: "Rock",
    };
    render(createElement(PresetPicker, { current: {}, onApply, presets: [preset] }));

    await user.click(screen.getByRole("button", { name: "Choose preset" }));
    await user.click(screen.getByRole("button", { name: "Metadata-free patch" }));

    const patch = onApply.mock.calls[0]?.[0];
    expect(patch).toEqual({ genre: "Rock" });
    expect(patch).not.toHaveProperty("id");
    expect(patch).not.toHaveProperty("name");
    expect(patch).not.toHaveProperty("source");
  });

  it("disables the picker trigger and keeps the dialog closed", async () => {
    const user = openPicker();
    render(
      createElement(PresetPicker, {
        current: {},
        disabled: true,
        onApply: vi.fn(),
        presets: [savedPreset],
      }),
    );

    const trigger = screen.getByRole("button", { name: "Choose preset" });
    await user.click(trigger);
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(trigger).toBeDisabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
