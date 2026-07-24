"use client";

import { createElement, KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { previewPresetOverwrite } from "@/lib/upload/metadata";
import type { UploadPresetView, UploadValuePatch, UploadValues } from "@/lib/upload/types";

type PresetPickerProps = {
  current: UploadValuePatch;
  presets: UploadPresetView[];
  onApply: (patch: UploadValuePatch) => void;
  disabled?: boolean;
};

const uploadFieldKeys = [
  "title",
  "artist",
  "genre",
  "album",
  "tags",
  "license",
  "description",
  "price",
  "releaseDate",
  "allowDownload",
  "published",
] as const satisfies readonly (keyof UploadValues)[];

const fieldLabels: Record<keyof UploadValues, string> = {
  title: "Title",
  artist: "Artist",
  genre: "Genre",
  album: "Album",
  tags: "Tags",
  license: "License",
  description: "Description",
  price: "Price",
  releaseDate: "Release date",
  allowDownload: "Allow downloads",
  published: "Published",
};

function toUploadPatch(preset: UploadPresetView): UploadValuePatch {
  return uploadFieldKeys.reduce<UploadValuePatch>((patch, key) => {
    const value = preset[key];

    if (value !== undefined) {
      Object.assign(patch, { [key]: value });
    }

    return patch;
  }, {});
}

function formatValue(value: UploadValues[keyof UploadValues] | undefined) {
  if (value === "") {
    return "Empty";
  }

  if (typeof value === "boolean") {
    return value ? "On" : "Off";
  }

  return value ?? "Empty";
}

/** Selects an upload patch, confirming populated values that would be replaced. */
export function PresetPicker({ current, presets, onApply, disabled = false }: PresetPickerProps) {
  const dialogId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"picker" | "confirmation" | null>(null);
  const [pendingPresetId, setPendingPresetId] = useState<string | null>(null);
  const savedPresets = presets.filter((preset) => preset.source === "saved");
  const trackPresets = presets.filter((preset) => preset.source === "track");
  const pendingPreset =
    pendingPresetId === null ? null : presets.find((preset) => preset.id === pendingPresetId) ?? null;
  const hasMissingPendingPreset = mode === "confirmation" && pendingPresetId !== null && !pendingPreset;
  const isOpen = mode !== null && !disabled && !hasMissingPendingPreset;

  const close = (restoreFocus = true) => {
    setMode(null);
    setPendingPresetId(null);

    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  useEffect(() => {
    if (disabled && mode !== null) {
      close(false);
      return;
    }

    if (hasMissingPendingPreset) {
      close();
    }
  }, [disabled, hasMissingPendingPreset, mode]);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen, mode]);

  const apply = (preset: UploadPresetView) => {
    onApply(toUploadPatch(preset));
    close();
  };

  const choosePreset = (preset: UploadPresetView) => {
    if (disabled) {
      return;
    }

    const patch = toUploadPatch(preset);
    const overwrittenFields = previewPresetOverwrite(current, patch);

    if (overwrittenFields.length === 0) {
      apply(preset);
      return;
    }

    setPendingPresetId(preset.id);
    setMode("confirmation");
  };

  const onDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  const createPresetSection = (title: string, groupPresets: UploadPresetView[]) => {
    if (groupPresets.length === 0) {
      return null;
    }

    const sectionId = `${dialogId}-${title.toLocaleLowerCase().replaceAll(" ", "-")}`;

    return createElement(
      "section",
      { "aria-labelledby": sectionId, className: "space-y-2", key: title },
      createElement("h3", { className: "text-xs font-semibold uppercase tracking-wide text-muted", id: sectionId }, title),
      createElement(
        "div",
        { className: "space-y-1" },
        groupPresets.map((preset) =>
          createElement(
            "button",
            {
              className:
                "upload-control-focus flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-soft hover:text-ink",
              key: preset.id,
              onClick: () => choosePreset(preset),
              type: "button",
            },
            preset.name,
          ),
        ),
      ),
    );
  };

  const pickerDialog =
    mode === "picker" && !disabled
      ? createElement(
          "div",
          {
            "aria-labelledby": `${dialogId}-title`,
            className:
              "mt-2 w-full rounded-2xl border border-line bg-white p-4 text-ink shadow-2xl shadow-black/10",
            id: dialogId,
            onKeyDown: onDialogKeyDown,
            ref: dialogRef,
            role: "dialog",
            tabIndex: -1,
          },
          createElement(
            "div",
            { className: "mb-4 flex items-center justify-between gap-4" },
            createElement("h2", { className: "text-sm font-semibold", id: `${dialogId}-title` }, "Upload presets"),
            createElement(
              "button",
              {
                "aria-label": "Close preset picker",
                className:
                  "upload-control-focus rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-soft hover:text-ink",
                onClick: () => close(),
                type: "button",
              },
              "Close",
            ),
          ),
          savedPresets.length || trackPresets.length
            ? createElement(
                "div",
                { className: "space-y-5" },
                createPresetSection("Saved presets", savedPresets),
                createPresetSection("Previous tracks", trackPresets),
              )
            : createElement("p", { className: "text-sm text-muted" }, "No presets available"),
        )
      : null;

  const confirmationDialog =
    mode === "confirmation" && pendingPreset && !disabled
      ? (() => {
          const patch = toUploadPatch(pendingPreset);
          const overwrittenFields = previewPresetOverwrite(current, patch);

          return createElement(
            "div",
            {
              "aria-labelledby": `${dialogId}-title`,
              className:
                "mt-2 w-full rounded-2xl border border-line bg-white p-4 text-ink shadow-2xl shadow-black/10",
              id: dialogId,
              onKeyDown: onDialogKeyDown,
              ref: dialogRef,
              role: "dialog",
              tabIndex: -1,
            },
            createElement(
              "h2",
              { className: "text-sm font-semibold", id: `${dialogId}-title` },
              `Apply ${pendingPreset.name} preset`,
            ),
            createElement(
              "p",
              { className: "mt-2 text-sm text-muted" },
              "This preset will replace the following values:",
            ),
            createElement(
              "ul",
              { className: "mt-3 space-y-2" },
              overwrittenFields.map((field) =>
                createElement(
                  "li",
                  { className: "rounded-lg bg-black/20 px-3 py-2 text-sm", key: field },
                  createElement("span", { className: "font-medium text-ink" }, fieldLabels[field]),
                  createElement("span", { className: "mx-2 text-faint", "aria-hidden": true }, "→"),
                  createElement("span", { className: "sr-only" }, "Current value: "),
                  createElement("span", { className: "text-muted" }, formatValue(current[field])),
                  createElement("span", { className: "mx-2 text-faint", "aria-hidden": true }, "→"),
                  createElement("span", { className: "sr-only" }, "Preset value: "),
                  createElement("span", { className: "text-ink" }, formatValue(patch[field])),
                ),
              ),
            ),
            createElement(
              "div",
              { className: "mt-5 flex justify-end gap-3" },
              createElement(
                "button",
                {
                  className:
                    "upload-control-focus rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:bg-soft hover:text-ink",
                  onClick: () => close(),
                  type: "button",
                },
                "Cancel",
              ),
              createElement(
                "button",
                {
                  className:
                    "upload-control-focus rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-500",
                  onClick: () => apply(pendingPreset),
                  type: "button",
                },
                "Apply preset",
              ),
            ),
          );
        })()
      : null;

  return createElement(
    "div",
    { className: "relative" },
    createElement(
      "button",
      {
        "aria-controls": isOpen ? dialogId : undefined,
        "aria-expanded": isOpen,
        "aria-haspopup": "dialog",
        className:
          "upload-control-focus rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-soft disabled:cursor-not-allowed disabled:opacity-50",
        disabled,
        onClick: () => {
          if (!disabled) {
            setPendingPresetId(null);
            setMode("picker");
          }
        },
        ref: triggerRef,
        type: "button",
      },
      "Choose preset",
    ),
    pickerDialog,
    confirmationDialog,
  );
}
