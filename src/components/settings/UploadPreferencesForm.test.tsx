import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  updateUploadConcurrency: vi.fn(),
  createUploadPreset: vi.fn(),
  updateUploadPreset: vi.fn(),
  deleteUploadPreset: vi.fn(),
}));

vi.mock("@/lib/upload/actions", () => actions);

import { UploadPreferencesForm } from "./UploadPreferencesForm";

describe("UploadPreferencesForm", () => {
  beforeEach(() => {
    actions.updateUploadConcurrency.mockResolvedValue({ concurrency: 3 });
    actions.createUploadPreset.mockResolvedValue({ presetId: "created-preset" });
    actions.updateUploadPreset.mockResolvedValue({ presetId: "preset-1" });
    actions.deleteUploadPreset.mockResolvedValue({ presetId: "preset-1" });
  });

  it("saves a selected concurrency from the four accessible options", async () => {
    const user = userEvent.setup();
    render(createElement(UploadPreferencesForm, { concurrency: 2, presets: [] }));

    expect(screen.getByRole("button", { name: "2 concurrent uploads" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "3 concurrent uploads" }));
    await user.click(screen.getByRole("button", { name: "Save concurrency" }));

    await waitFor(() => expect(actions.updateUploadConcurrency).toHaveBeenCalledWith(3));
  });

  it("creates a preset with only enabled optional fields", async () => {
    const user = userEvent.setup();
    render(createElement(UploadPreferencesForm, { concurrency: 2, presets: [] }));

    await user.click(screen.getByRole("button", { name: "New preset" }));
    await user.type(screen.getByLabelText("Preset name"), "Night set");
    await user.click(screen.getByRole("button", { name: "Include artist" }));
    await user.type(screen.getByRole("combobox", { name: "Artist" }), "Nova Vale");
    await user.click(screen.getByRole("button", { name: "Create preset" }));

    await waitFor(() => expect(actions.createUploadPreset).toHaveBeenCalledTimes(1));
    const formData = actions.createUploadPreset.mock.calls[0]?.[0] as FormData;
    expect(formData.get("name")).toBe("Night set");
    expect(formData.get("artist")).toBe("Nova Vale");
    expect(formData.has("genre")).toBe(false);
  });

  it("defaults a newly enabled download switch to off", async () => {
    const user = userEvent.setup();
    render(createElement(UploadPreferencesForm, { concurrency: 2, presets: [] }));

    await user.click(screen.getByRole("button", { name: "New preset" }));
    await user.click(screen.getByRole("button", { name: "Include allow downloads" }));

    expect(screen.getByRole("switch", { name: "Allow downloads" })).toHaveAttribute("aria-checked", "false");
  });

  it("offers edit and confirmed delete controls for saved presets", async () => {
    const user = userEvent.setup();
    render(
      createElement(UploadPreferencesForm, {
        concurrency: 2,
        presets: [{ id: "preset-1", name: "Night set", source: "saved", artist: "Nova Vale" }],
      }),
    );

    await user.click(screen.getByRole("button", { name: "Edit Night set" }));
    expect(screen.getByLabelText("Preset name")).toHaveValue("Night set");

    await user.click(screen.getByRole("button", { name: "Cancel editor" }));
    await user.click(screen.getByRole("button", { name: "Delete Night set" }));
    expect(screen.getByRole("dialog", { name: "Delete Night set preset" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => expect(actions.deleteUploadPreset).toHaveBeenCalledWith("preset-1"));
  });

  it("shows safe action errors in an alert on the dark accessible surface", async () => {
    actions.updateUploadConcurrency.mockRejectedValueOnce(new Error("Could not save preferences."));
    const user = userEvent.setup();
    render(createElement(UploadPreferencesForm, { concurrency: 2, presets: [] }));

    const region = screen.getByRole("region", { name: "Upload preferences" });
    expect(region).not.toHaveClass("bg-white");
    await user.click(screen.getByRole("button", { name: "Save concurrency" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save preferences.");
  });
});
import { createElement } from "react";
