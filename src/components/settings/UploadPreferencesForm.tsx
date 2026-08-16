"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { createUploadPreset, deleteUploadPreset, updateUploadConcurrency, updateUploadPreset } from "@/lib/upload/actions";
import type { UploadPresetView } from "@/lib/upload/types";
import {
  editorFromPreset,
  emptyEditor,
  formDataFromEditor,
  type EditorState,
  type OptionalPresetField,
  UploadPresetEditor,
} from "./UploadPresetEditor";

type UploadPreferencesFormProps = {
  concurrency: number;
  presets: UploadPresetView[];
  error?: string;
};

function savedOnly(presets: UploadPresetView[]) {
  return presets.filter((preset) => preset.source === "saved");
}

function fieldsFromEditor(editor: EditorState, enabled: Set<OptionalPresetField>) {
  return Object.fromEntries(Array.from(enabled).map((field) => [field, editor.values[field]]));
}

export function UploadPreferencesForm({ concurrency, presets, error }: UploadPreferencesFormProps) {
  const [selectedConcurrency, setSelectedConcurrency] = useState(concurrency);
  const [savedPresets, setSavedPresets] = useState(() => savedOnly(presets));
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UploadPresetView | null>(null);
  const [message, setMessage] = useState<string | null>(error ?? null);
  const [pending, startTransition] = useTransition();
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement | null>(null);
  const confirmDeleteRef = useRef<HTMLButtonElement | null>(null);
  const wasDeletingRef = useRef(false);

  useEffect(() => {
    setSelectedConcurrency(concurrency);
    setSavedPresets(savedOnly(presets));
  }, [concurrency, presets]);

  useEffect(() => {
    if (deleteTarget) {
      wasDeletingRef.current = true;
      cancelDeleteRef.current?.focus();
    } else if (wasDeletingRef.current) {
      deleteTriggerRef.current?.focus();
      wasDeletingRef.current = false;
    }
  }, [deleteTarget]);

  const run = (work: () => Promise<void>) => {
    setMessage(null);
    startTransition(async () => {
      try {
        await work();
      } catch {
        setMessage("Unable to save your upload preferences.");
      }
    });
  };

  const saveEditor = (draft: EditorState, enabled: Set<OptionalPresetField>) => {
    run(async () => {
      const formData = formDataFromEditor(draft, enabled);
      const result = draft.id
        ? await updateUploadPreset(draft.id, formData)
        : await createUploadPreset(formData);

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      const nextPreset: UploadPresetView = {
        id: result.data.presetId,
        name: draft.name.trim(),
        source: "saved",
        ...fieldsFromEditor(draft, enabled),
      };
      setSavedPresets((current) =>
        draft.id ? current.map((preset) => (preset.id === result.data.presetId ? nextPreset : preset)) : [nextPreset, ...current],
      );
      setEditor(null);
    });
  };

  const saveConcurrency = () => {
    run(async () => {
      const result = await updateUploadConcurrency(selectedConcurrency);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setSelectedConcurrency(result.data.concurrency);
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    run(async () => {
      const result = await deleteUploadPreset(target.id);
      if (!result.ok) {
        setDeleteTarget(null);
        setMessage(result.error);
        return;
      }
      setSavedPresets((current) => current.filter((preset) => preset.id !== target.id));
      setDeleteTarget(null);
    });
  };

  return (
    <>
      <section aria-label="Upload preferences" aria-hidden={deleteTarget ? true : undefined} className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-line bg-canvas p-5 text-ink shadow-2xl shadow-black/5 sm:p-8">
        <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Creator settings</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Upload preferences</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Keep your upload queue and reusable metadata presets under your control.</p></header>
        {message ? <p role="alert" className="rounded-xl border border-line bg-soft px-4 py-3 text-sm text-ink">{message}</p> : null}

        <div className="rounded-2xl border border-line bg-panel p-5"><h2 className="text-lg font-semibold text-ink">Upload queue</h2><p className="mt-1 text-sm text-muted">Choose how many audio uploads can process at once.</p><div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Upload concurrency">{[1, 2, 3, 4].map((value) => <button key={value} type="button" aria-pressed={selectedConcurrency === value} aria-label={`${value} concurrent uploads`} onClick={() => setSelectedConcurrency(value)} disabled={pending} className={`upload-control-focus h-11 min-w-11 rounded-lg border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedConcurrency === value ? "border-ink bg-ink text-canvas" : "border-line bg-canvas text-muted hover:border-ink hover:text-ink"}`}>{value}</button>)}</div><button type="button" onClick={saveConcurrency} disabled={pending} className="upload-control-focus mt-4 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-canvas transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"><Save aria-hidden="true" className="h-4 w-4" />{pending ? "Saving…" : "Save concurrency"}</button></div>

        <div className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-ink">Named presets</h2><p className="mt-1 text-sm text-muted">Saved presets apply only the fields you explicitly include.</p></div><button type="button" onClick={() => setEditor(emptyEditor())} disabled={pending || editor !== null} className="upload-control-focus inline-flex items-center gap-2 rounded-lg border border-ink bg-ink/5 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-50"><Plus aria-hidden="true" className="h-4 w-4" />New preset</button></div>
          {editor ? <UploadPresetEditor editor={editor} presets={savedPresets} pending={pending} onCancel={() => setEditor(null)} onSave={saveEditor} /> : null}
          {savedPresets.length ? <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">{savedPresets.map((preset) => <li key={preset.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate font-medium text-ink">{preset.name}</p><p className="mt-1 text-xs text-muted">{Object.keys(preset).filter((key) => !["id", "name", "source"].includes(key)).length} fields included</p></div><div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => setEditor(editorFromPreset(preset))} disabled={pending} className="upload-control-focus rounded-lg p-2 text-muted transition hover:bg-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Edit ${preset.name}`}><Pencil aria-hidden="true" className="h-4 w-4" /></button><button type="button" onClick={(event) => { deleteTriggerRef.current = event.currentTarget; setDeleteTarget(preset); }} disabled={pending} className="upload-control-focus rounded-lg p-2 text-muted transition hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Delete ${preset.name}`}><Trash2 aria-hidden="true" className="h-4 w-4" /></button></div></li>)}</ul> : !editor ? <p className="rounded-2xl border border-dashed border-line bg-soft p-5 text-sm text-muted">No named presets yet. Create one to reuse your preferred upload metadata.</p> : null}
        </div>
      </section>

      {deleteTarget ? <div role="alertdialog" aria-modal="true" aria-label={`Delete ${deleteTarget.name} preset`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setDeleteTarget(null); } if (event.key === "Tab") { event.preventDefault(); (document.activeElement === cancelDeleteRef.current ? confirmDeleteRef.current : cancelDeleteRef.current)?.focus(); } }}><div className="w-full max-w-md rounded-2xl border border-line bg-canvas p-5 shadow-2xl shadow-black/5"><h2 className="text-lg font-semibold text-ink">Delete {deleteTarget.name}?</h2><p className="mt-2 text-sm text-muted">This removes the saved preset and cannot be undone.</p><div className="mt-5 flex justify-end gap-3"><button ref={cancelDeleteRef} type="button" onClick={() => setDeleteTarget(null)} disabled={pending} className="upload-control-focus rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-50">Cancel</button><button ref={confirmDeleteRef} type="button" onClick={confirmDelete} disabled={pending} className="upload-control-focus rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-canvas transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Deleting…" : "Confirm delete"}</button></div></div></div> : null}
    </>
  );
}
