"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { createUploadPreset, deleteUploadPreset, updateUploadConcurrency, updateUploadPreset } from "@/lib/upload/actions";
import type { UploadPresetView, UploadValuePatch, UploadValues } from "@/lib/upload/types";
import { DatePicker } from "@/components/upload/DatePicker";
import { SuggestionField } from "@/components/upload/SuggestionField";
import { SwitchField } from "@/components/upload/SwitchField";

type UploadPreferencesFormProps = {
  concurrency: number;
  presets: UploadPresetView[];
  error?: string;
};

type EditorState = {
  id: string | null;
  name: string;
  values: UploadValuePatch;
};

type StringPresetField = Exclude<keyof UploadValues, "allowDownload" | "published">;
type OptionalPresetField = keyof UploadValues;

const stringFields: Array<{ key: StringPresetField; label: string; kind: "text" | "textarea" | "date" | "number" }> = [
  { key: "title", label: "Title", kind: "text" },
  { key: "artist", label: "Artist", kind: "text" },
  { key: "genre", label: "Genre", kind: "text" },
  { key: "album", label: "Album or project", kind: "text" },
  { key: "tags", label: "Tags", kind: "text" },
  { key: "license", label: "License", kind: "text" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "price", label: "Price", kind: "number" },
  { key: "releaseDate", label: "Release date", kind: "date" },
];

const booleanFields: Array<{ key: "allowDownload" | "published"; label: string }> = [
  { key: "allowDownload", label: "Allow downloads" },
  { key: "published", label: "Published" },
];

function emptyEditor(): EditorState {
  return { id: null, name: "", values: {} };
}

function editorFromPreset(preset: UploadPresetView): EditorState {
  const { id, name, source: _source, ...values } = preset;

  return { id, name, values };
}

function formDataFromEditor(editor: EditorState, enabled: Set<OptionalPresetField>) {
  const formData = new FormData();
  formData.set("name", editor.name);

  for (const field of stringFields) {
    if (enabled.has(field.key)) {
      formData.set(field.key, editor.values[field.key] ?? "");
    }
  }

  for (const field of booleanFields) {
    if (enabled.has(field.key)) {
      formData.set(field.key, editor.values[field.key] ? "on" : "off");
    }
  }

  return formData;
}

function suggestionsFromPresets(presets: UploadPresetView[]) {
  const suggestions = {
    artist: [] as string[],
    genre: [] as string[],
    album: [] as string[],
    tags: [] as string[],
    license: [] as string[],
  };

  for (const preset of presets) {
    for (const field of Object.keys(suggestions) as Array<keyof typeof suggestions>) {
      const value = preset[field];

      if (typeof value === "string" && value.trim()) {
        suggestions[field].push(value);
      }
    }
  }

  return Object.fromEntries(
    Object.entries(suggestions).map(([key, values]) => [
      key,
      Array.from(new Set(values.map((value) => value.trim()))),
    ]),
  ) as typeof suggestions;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to save your upload preferences.";
}

function UploadPresetEditor({
  editor,
  presets,
  onCancel,
  onSave,
  pending,
}: {
  editor: EditorState;
  presets: UploadPresetView[];
  onCancel: () => void;
  onSave: (editor: EditorState, enabled: Set<OptionalPresetField>) => void;
  pending: boolean;
}) {
  const [draft, setDraft] = useState(editor);
  const [enabled, setEnabled] = useState<Set<OptionalPresetField>>(
    () => new Set(Object.keys(editor.values) as OptionalPresetField[]),
  );
  const suggestions = useMemo(() => suggestionsFromPresets(presets), [presets]);

  useEffect(() => {
    setDraft(editor);
    setEnabled(new Set(Object.keys(editor.values) as OptionalPresetField[]));
  }, [editor]);

  const setValue = <K extends keyof UploadValues>(field: K, value: UploadValues[K]) => {
    setDraft((current) => ({
      ...current,
      values: { ...current.values, [field]: value },
    }));
  };

  const include = (field: OptionalPresetField) => {
    setEnabled((current) => new Set(current).add(field));
    if (draft.values[field] === undefined) {
      const isBoolean = field === "allowDownload" || field === "published";
      setDraft((current) => ({
        ...current,
        values: { ...current.values, [field]: isBoolean ? false : "" },
      }));
    }
  };

  const remove = (field: OptionalPresetField) => {
    setEnabled((current) => {
      const next = new Set(current);
      next.delete(field);
      return next;
    });
  };

  const renderOptionalControl = (field: (typeof stringFields)[number]) => {
    const isEnabled = enabled.has(field.key);

    if (!isEnabled) {
      return (
        <button
          type="button"
          onClick={() => include(field.key)}
          disabled={pending}
          className="upload-control-focus rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-200 transition hover:border-rose-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Include ${field.label.toLowerCase()}`}
        >
          Include {field.label}
        </button>
      );
    }

    const value = draft.values[field.key] ?? "";
    const removeButton = (
      <button
        type="button"
        onClick={() => remove(field.key)}
        disabled={pending}
        className="upload-control-focus shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Remove ${field.label.toLowerCase()}`}
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    );

    if (field.kind === "date") {
      return (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <DatePicker
              label={field.label}
              name={field.key}
              value={value}
              onChange={(nextValue) => setValue(field.key, nextValue)}
              disabled={pending}
            />
          </div>
          {removeButton}
        </div>
      );
    }

    if (field.kind === "textarea") {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`preset-${field.key}`} className="text-sm font-medium text-zinc-200">
              {field.label}
            </label>
            {removeButton}
          </div>
          <textarea
            id={`preset-${field.key}`}
            value={value}
            onChange={(event) => setValue(field.key, event.target.value)}
            disabled={pending}
            rows={3}
            className="upload-control-focus w-full resize-y rounded-lg border border-white/15 bg-surface-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      );
    }

    if (field.kind === "number") {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`preset-${field.key}`} className="text-sm font-medium text-zinc-200">
              {field.label}
            </label>
            {removeButton}
          </div>
          <input
            id={`preset-${field.key}`}
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(event) => setValue(field.key, event.target.value)}
            disabled={pending}
            className="upload-control-focus w-full rounded-lg border border-white/15 bg-surface-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      );
    }

    const supportsSuggestions = field.key in suggestions;

    return (
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          {supportsSuggestions ? (
            <SuggestionField
              label={field.label}
              value={value}
              suggestions={suggestions[field.key as keyof typeof suggestions]}
              onChange={(nextValue) => setValue(field.key, nextValue)}
              disabled={pending}
            />
          ) : (
            <>
              <label htmlFor={`preset-${field.key}`} className="mb-2 block text-sm font-medium text-zinc-200">
                {field.label}
              </label>
              <input
                id={`preset-${field.key}`}
                value={value}
                onChange={(event) => setValue(field.key, event.target.value)}
                disabled={pending}
                className="upload-control-focus w-full rounded-lg border border-white/15 bg-surface-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </>
          )}
        </div>
        {removeButton}
      </div>
    );
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft, enabled);
      }}
      className="space-y-5 rounded-2xl border border-rose-400/30 bg-surface-950 p-5 shadow-2xl shadow-black/25"
      aria-label={draft.id ? "Edit upload preset" : "New upload preset"}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{draft.id ? "Edit preset" : "New preset"}</h2>
          <p className="mt-1 text-sm text-zinc-400">Choose exactly which values this preset should apply.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="upload-control-focus rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Cancel editor"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      <div>
        <label htmlFor="preset-name" className="mb-2 block text-sm font-medium text-zinc-200">
          Preset name
        </label>
        <input
          id="preset-name"
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          disabled={pending}
          required
          maxLength={80}
          className="upload-control-focus w-full rounded-lg border border-white/15 bg-surface-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {stringFields.map((field) => <div key={field.key}>{renderOptionalControl(field)}</div>)}
      </div>

      <div className="grid gap-3 border-t border-white/10 pt-4 md:grid-cols-2">
        {booleanFields.map((field) =>
          enabled.has(field.key) ? (
            <div key={field.key} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2">
              <div className="min-w-0 flex-1">
                <SwitchField
                  name={field.key}
                  label={field.label}
                  checked={draft.values[field.key] ?? false}
                  onChange={(nextValue) => setValue(field.key, nextValue)}
                  disabled={pending}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(field.key)}
                disabled={pending}
                className="upload-control-focus rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Remove ${field.label.toLowerCase()}`}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              key={field.key}
              type="button"
              onClick={() => include(field.key)}
              disabled={pending}
              className="upload-control-focus rounded-lg border border-white/15 px-3 py-2 text-left text-sm text-zinc-200 transition hover:border-rose-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Include ${field.label.toLowerCase()}`}
            >
              Include {field.label}
            </button>
          ),
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="upload-control-focus rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="upload-control-focus inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          {pending ? "Saving…" : draft.id ? "Save preset" : "Create preset"}
        </button>
      </div>
    </form>
  );
}

export function UploadPreferencesForm({ concurrency, presets, error }: UploadPreferencesFormProps) {
  const [selectedConcurrency, setSelectedConcurrency] = useState(concurrency);
  const [savedPresets, setSavedPresets] = useState(() => presets.filter((preset) => preset.source === "saved"));
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UploadPresetView | null>(null);
  const [message, setMessage] = useState<string | null>(error ?? null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedConcurrency(concurrency);
    setSavedPresets(presets.filter((preset) => preset.source === "saved"));
  }, [concurrency, presets]);

  const runAction = (action: () => Promise<void>) => {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
      } catch (actionError) {
        setMessage(errorMessage(actionError));
      }
    });
  };

  const saveEditor = (draft: EditorState, enabled: Set<OptionalPresetField>) => {
    runAction(async () => {
      const formData = formDataFromEditor(draft, enabled);

      if (draft.id) {
        const { presetId } = await updateUploadPreset(draft.id, formData);
        const updated: UploadPresetView = {
          id: presetId,
          name: draft.name.trim(),
          source: "saved",
          ...Object.fromEntries(
            Array.from(enabled).map((field) => [field, draft.values[field]]),
          ),
        };
        setSavedPresets((current) => current.map((preset) => (preset.id === presetId ? updated : preset)));
      } else {
        const { presetId } = await createUploadPreset(formData);
        const created: UploadPresetView = {
          id: presetId,
          name: draft.name.trim(),
          source: "saved",
          ...Object.fromEntries(
            Array.from(enabled).map((field) => [field, draft.values[field]]),
          ),
        };
        setSavedPresets((current) => [created, ...current]);
      }

      setEditor(null);
    });
  };

  return (
    <section
      aria-label="Upload preferences"
      className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-white/10 bg-surface-950 p-5 text-white shadow-2xl shadow-black/30 sm:p-8"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-300">Creator settings</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Upload preferences</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Keep your upload queue and reusable metadata presets under your control.
        </p>
      </header>

      {message ? (
        <p role="alert" className="rounded-xl border border-rose-400/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-100">
          {message}
        </p>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-surface-900/70 p-5">
        <h2 className="text-lg font-semibold text-white">Upload queue</h2>
        <p className="mt-1 text-sm text-zinc-400">Choose how many audio uploads can process at once.</p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Upload concurrency">
          {[1, 2, 3, 4].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={selectedConcurrency === value}
              aria-label={`${value} concurrent uploads`}
              onClick={() => setSelectedConcurrency(value)}
              disabled={pending}
              className={`upload-control-focus h-11 min-w-11 rounded-lg border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                selectedConcurrency === value
                  ? "border-rose-300 bg-rose-600 text-white"
                  : "border-white/15 bg-surface-950 text-zinc-300 hover:border-rose-400/60 hover:text-white"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            runAction(async () => {
              const result = await updateUploadConcurrency(selectedConcurrency);
              setSelectedConcurrency(result.concurrency);
            })
          }
          disabled={pending}
          className="upload-control-focus mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          {pending ? "Saving…" : "Save concurrency"}
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Named presets</h2>
            <p className="mt-1 text-sm text-zinc-400">Saved presets apply only the fields you explicitly include.</p>
          </div>
          <button
            type="button"
            onClick={() => setEditor(emptyEditor())}
            disabled={pending || editor !== null}
            className="upload-control-focus inline-flex items-center gap-2 rounded-lg border border-rose-400/60 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            New preset
          </button>
        </div>

        {editor ? (
          <UploadPresetEditor
            editor={editor}
            presets={savedPresets}
            onCancel={() => setEditor(null)}
            onSave={saveEditor}
            pending={pending}
          />
        ) : null}

        {savedPresets.length ? (
          <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-surface-900/70">
            {savedPresets.map((preset) => (
              <li key={preset.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{preset.name}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {Object.keys(preset).filter((key) => !["id", "name", "source"].includes(key)).length} fields included
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditor(editorFromPreset(preset))}
                    disabled={pending}
                    className="upload-control-focus rounded-lg p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Edit ${preset.name}`}
                  >
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(preset)}
                    disabled={pending}
                    className="upload-control-focus rounded-lg p-2 text-zinc-300 transition hover:bg-rose-500/15 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Delete ${preset.name}`}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : !editor ? (
          <p className="rounded-2xl border border-dashed border-white/15 bg-surface-900/50 p-5 text-sm text-zinc-400">
            No named presets yet. Create one to reuse your preferred upload metadata.
          </p>
        ) : null}
      </div>

      {deleteTarget ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Delete ${deleteTarget.name} preset`}
          className="rounded-2xl border border-rose-400/40 bg-surface-900 p-5 shadow-2xl shadow-black/40"
        >
          <h2 className="text-lg font-semibold text-white">Delete {deleteTarget.name}?</h2>
          <p className="mt-2 text-sm text-zinc-400">This removes the saved preset and cannot be undone.</p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={pending}
              className="upload-control-focus rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                runAction(async () => {
                  await deleteUploadPreset(deleteTarget.id);
                  setSavedPresets((current) => current.filter((preset) => preset.id !== deleteTarget.id));
                  setDeleteTarget(null);
                })
              }
              disabled={pending}
              className="upload-control-focus rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Confirm delete"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
