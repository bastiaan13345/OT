import { createElement } from "react";
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
    actions.updateUploadConcurrency.mockResolvedValue({ ok: true, data: { concurrency: 3 } });
    actions.createUploadPreset.mockResolvedValue({ ok: true, data: { presetId: "created-preset" } });
    actions.updateUploadPreset.mockResolvedValue({ ok: true, data: { presetId: "preset-1" } });
    actions.deleteUploadPreset.mockResolvedValue({ ok: true, data: { presetId: "preset-1" } });
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

  it("opens a fixed keyboard-safe delete alertdialog and restores its trigger on Escape", async () => {
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
    const deleteTrigger = screen.getByRole("button", { name: "Delete Night set" });
    await user.click(deleteTrigger);
    const dialog = screen.getByRole("alertdialog", { name: "Delete Night set preset" });
    expect(dialog).toHaveClass("fixed");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Confirm delete" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(deleteTrigger).toHaveFocus();

    await user.click(deleteTrigger);
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => expect(actions.deleteUploadPreset).toHaveBeenCalledWith("preset-1"));
  });

  it("shows safe action errors in an alert on the light accessible surface", async () => {
    actions.updateUploadConcurrency.mockResolvedValueOnce({ ok: false, error: "Could not save preferences." });
    const user = userEvent.setup();
    render(createElement(UploadPreferencesForm, { concurrency: 2, presets: [] }));

    const region = screen.getByRole("region", { name: "Upload preferences" });
    expect(region).toHaveClass("bg-canvas");
    await user.click(screen.getByRole("button", { name: "Save concurrency" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save preferences.");
  });

  it("shows serializable create, edit, and delete failures as alerts", async () => {
    const user = userEvent.setup();
    actions.createUploadPreset.mockResolvedValueOnce({ ok: false, error: "A preset with this name already exists." });
    const { rerender } = render(createElement(UploadPreferencesForm, { concurrency: 2, presets: [] }));

    await user.click(screen.getByRole("button", { name: "New preset" }));
    await user.type(screen.getByLabelText("Preset name"), "Night set");
    await user.click(screen.getByRole("button", { name: "Create preset" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("A preset with this name already exists.");

    actions.updateUploadPreset.mockResolvedValueOnce({ ok: false, error: "Preset not found." });
    rerender(createElement(UploadPreferencesForm, { concurrency: 2, presets: [{ id: "preset-1", name: "Night set", source: "saved" }] }));
    await user.click(screen.getByRole("button", { name: "Edit Night set" }));
    await user.click(screen.getByRole("button", { name: "Save preset" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Preset not found.");

    actions.deleteUploadPreset.mockResolvedValueOnce({ ok: false, error: "Preset not found." });
    await user.click(screen.getByRole("button", { name: "Cancel editor" }));
    await user.click(screen.getByRole("button", { name: "Delete Night set" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Preset not found.");
  });

  it("disables duplicate submissions while a save is pending", async () => {
    let finishSave: ((value: { ok: true; data: { concurrency: number } }) => void) | undefined;
    actions.updateUploadConcurrency.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    );
    const user = userEvent.setup();
    render(createElement(UploadPreferencesForm, { concurrency: 2, presets: [] }));

    const saveButton = screen.getByRole("button", { name: "Save concurrency" });
    await user.click(saveButton);
    expect(saveButton).toBeDisabled();
    finishSave?.({ ok: true, data: { concurrency: 2 } });
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    expect(actions.updateUploadConcurrency).toHaveBeenCalledTimes(1);
  });

  it("reconciles saved presets when server props refresh", () => {
    const { rerender } = render(
      createElement(UploadPreferencesForm, {
        concurrency: 2,
        presets: [{ id: "old", name: "Old preset", source: "saved" }],
      }),
    );

    rerender(
      createElement(UploadPreferencesForm, {
        concurrency: 4,
        presets: [{ id: "fresh", name: "Fresh preset", source: "saved" }],
      }),
    );

    expect(screen.getByText("Fresh preset")).toBeInTheDocument();
    expect(screen.queryByText("Old preset")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4 concurrent uploads" })).toHaveAttribute("aria-pressed", "true");
  });
});
