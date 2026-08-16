"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, X } from "lucide-react";
import { DatePicker } from "@/components/upload/DatePicker";
import { SuggestionField } from "@/components/upload/SuggestionField";
import { SwitchField } from "@/components/upload/SwitchField";
import type { UploadPresetView, UploadValuePatch, UploadValues } from "@/lib/upload/types";

export type EditorState = {
  id: string | null;
  name: string;
  values: UploadValuePatch;
};

export type OptionalPresetField = keyof UploadValues;
type StringPresetField = Exclude<OptionalPresetField, "allowDownload" | "published">;

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

export function emptyEditor(): EditorState {
  return { id: null, name: "", values: {} };
}

export function editorFromPreset(preset: UploadPresetView): EditorState {
  const { id, name, source: _source, ...values } = preset;

  return { id, name, values };
}

export function formDataFromEditor(editor: EditorState, enabled: Set<OptionalPresetField>) {
  const formData = new FormData();
  formData.set("name", editor.name);

  for (const field of stringFields) {
    if (enabled.has(field.key)) formData.set(field.key, editor.values[field.key] ?? "");
  }
  for (const field of booleanFields) {
    if (enabled.has(field.key)) formData.set(field.key, editor.values[field.key] ? "on" : "off");
  }

  return formData;
}

function suggestionsFromPresets(presets: UploadPresetView[]) {
  const suggestionKeys = ["artist", "genre", "album", "tags", "license"] as const;
  const suggestions = Object.fromEntries(suggestionKeys.map((key) => [key, [] as string[]])) as Record<
    (typeof suggestionKeys)[number],
    string[]
  >;

  for (const preset of presets) {
    for (const key of suggestionKeys) {
      const value = preset[key];
      if (typeof value === "string" && value.trim()) suggestions[key].push(value.trim());
    }
  }

  for (const key of suggestionKeys) {
    suggestions[key] = Array.from(new Set(suggestions[key].map((value) => value.toLocaleLowerCase())))
      .map((normalized) => suggestions[key].find((value) => value.toLocaleLowerCase() === normalized)!)
      .filter(Boolean);
  }

  return suggestions;
}

export function UploadPresetEditor({
  editor,
  presets,
  pending,
  onCancel,
  onSave,
}: {
  editor: EditorState;
  presets: UploadPresetView[];
  pending: boolean;
  onCancel: () => void;
  onSave: (editor: EditorState, enabled: Set<OptionalPresetField>) => void;
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

  const setValue = (field: OptionalPresetField, value: string | boolean) => {
    setDraft((current) => ({ ...current, values: { ...current.values, [field]: value } }));
  };

  const include = (field: OptionalPresetField) => {
    setEnabled((current) => new Set(current).add(field));
    setDraft((current) =>
      current.values[field] === undefined
        ? {
            ...current,
            values: {
              ...current.values,
              [field]: field === "allowDownload" || field === "published" ? false : "",
            },
          }
        : current,
    );
  };

  const remove = (field: OptionalPresetField) => {
    setEnabled((current) => {
      const next = new Set(current);
      next.delete(field);
      return next;
    });
  };

  const removeButton = (field: OptionalPresetField, label: string) => (
    <button
      type="button"
      onClick={() => remove(field)}
      disabled={pending}
      className="upload-control-focus shrink-0 rounded-lg p-2 text-muted transition hover:bg-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={`Remove ${label.toLowerCase()}`}
    >
      <X aria-hidden="true" className="h-4 w-4" />
    </button>
  );

  const textControl = (field: (typeof stringFields)[number]) => {
    if (!enabled.has(field.key)) {
      return (
        <button
          type="button"
          onClick={() => include(field.key)}
          disabled={pending}
          className="upload-control-focus rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Include ${field.label.toLowerCase()}`}
        >
          Include {field.label}
        </button>
      );
    }

    const value = String(draft.values[field.key] ?? "");
    if (field.kind === "date") {
      return <div className="flex items-end gap-2"><div className="min-w-0 flex-1"><DatePicker label={field.label} name={field.key} value={value} onChange={(next) => setValue(field.key, next)} disabled={pending} /></div>{removeButton(field.key, field.label)}</div>;
    }
    if (field.kind === "textarea") {
      return <div className="space-y-2"><div className="flex items-center justify-between gap-2"><label htmlFor={`preset-${field.key}`} className="text-sm font-medium text-ink">{field.label}</label>{removeButton(field.key, field.label)}</div><textarea id={`preset-${field.key}`} value={value} onChange={(event) => setValue(field.key, event.target.value)} disabled={pending} rows={3} maxLength={5000} className="upload-control-focus w-full resize-y rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50" /></div>;
    }
    if (field.kind === "number") {
      return <div className="space-y-2"><div className="flex items-center justify-between gap-2"><label htmlFor={`preset-${field.key}`} className="text-sm font-medium text-ink">{field.label}</label>{removeButton(field.key, field.label)}</div><input id={`preset-${field.key}`} type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(field.key, event.target.value)} disabled={pending} className="upload-control-focus w-full rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50" /></div>;
    }

    const suggested = field.key in suggestions;
    return <div className="flex items-end gap-2"><div className="min-w-0 flex-1">{suggested ? <SuggestionField label={field.label} value={value} suggestions={suggestions[field.key as keyof typeof suggestions]} onChange={(next) => setValue(field.key, next)} disabled={pending} /> : <><label htmlFor={`preset-${field.key}`} className="mb-2 block text-sm font-medium text-ink">{field.label}</label><input id={`preset-${field.key}`} value={value} onChange={(event) => setValue(field.key, event.target.value)} disabled={pending} maxLength={200} className="upload-control-focus w-full rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50" /></>}</div>{removeButton(field.key, field.label)}</div>;
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSave(draft, enabled); }} className="space-y-5 rounded-2xl border border-line bg-canvas p-5 shadow-2xl shadow-black/5" aria-label={draft.id ? "Edit upload preset" : "New upload preset"}>
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-ink">{draft.id ? "Edit preset" : "New preset"}</h2><p className="mt-1 text-sm text-muted">Choose exactly which values this preset should apply.</p></div><button type="button" onClick={onCancel} disabled={pending} className="upload-control-focus rounded-lg p-2 text-muted transition hover:bg-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-50" aria-label="Cancel editor"><X aria-hidden="true" className="h-5 w-5" /></button></div>
      <div><label htmlFor="preset-name" className="mb-2 block text-sm font-medium text-ink">Preset name</label><input id="preset-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} disabled={pending} required maxLength={80} className="upload-control-focus w-full rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50" /></div>
      <div className="grid gap-4 md:grid-cols-2">{stringFields.map((field) => <div key={field.key}>{textControl(field)}</div>)}</div>
      <div className="grid gap-3 border-t border-line pt-4 md:grid-cols-2">{booleanFields.map((field) => enabled.has(field.key) ? <div key={field.key} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2"><div className="min-w-0 flex-1"><SwitchField name={field.key} label={field.label} checked={Boolean(draft.values[field.key])} onChange={(next) => setValue(field.key, next)} disabled={pending} /></div>{removeButton(field.key, field.label)}</div> : <button key={field.key} type="button" onClick={() => include(field.key)} disabled={pending} className="upload-control-focus rounded-lg border border-line px-3 py-2 text-left text-sm text-ink transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Include ${field.label.toLowerCase()}`}>Include {field.label}</button>)}</div>
      <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} disabled={pending} className="upload-control-focus rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-50">Cancel</button><button type="submit" disabled={pending} className="upload-control-focus inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-canvas transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"><Save aria-hidden="true" className="h-4 w-4" />{pending ? "Saving…" : draft.id ? "Save preset" : "Create preset"}</button></div>
    </form>
  );
}
