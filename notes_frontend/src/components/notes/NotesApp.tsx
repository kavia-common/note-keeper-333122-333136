"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getNotesApi } from "@/lib/api";
import type {
  Note,
  NoteCreateInput,
  NoteId,
  NotesListQuery,
  NoteUpdateInput,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Chip, Label, TextInput } from "@/components/ui/Fields";
import { NoteEditorModal } from "@/components/notes/NoteEditorModal";
import { DeleteConfirmModal } from "@/components/notes/DeleteConfirmModal";

/**
 * Flow name: NotesAppUiFlow
 * Entrypoint: <NotesApp />
 *
 * Contract:
 * - Manages all notes UI interactions: list, select, search, optional tag filtering, create/edit/delete.
 * - Uses a single API adapter instance (getNotesApi) to ensure one canonical code path.
 *
 * Failure modes:
 * - API unreachable => adapter falls back to local storage (see getNotesApi).
 * - API errors => shown inline, with retry.
 * - Empty list => friendly empty state with clear primary action.
 *
 * Observability:
 * - console logs happen in adapter selection and API error boundaries (via ApiError messages).
 */
export function NotesApp() {
  const api = useMemo(() => getNotesApi(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<NoteId | null>(null);

  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string>("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");

  const [deleteOpen, setDeleteOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const selectedNote = useMemo(() => {
    return selectedId ? notes.find((n) => n.id === selectedId) ?? null : null;
  }, [notes, selectedId]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) for (const t of n.tags) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const query: NotesListQuery = useMemo(() => {
    return { q: q.trim() || undefined, tag: tag || undefined };
  }, [q, tag]);

  const loadNotes = useCallback(
    async (opts?: { preserveSelection?: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listNotes(query);
        setNotes(res.items);

        // Selection behavior:
        // - keep current selection if it still exists
        // - else select first note (desktop convenience)
        setSelectedId((prev) => {
          if (
            opts?.preserveSelection &&
            prev &&
            res.items.some((n) => n.id === prev)
          ) {
            return prev;
          }
          return res.items[0]?.id ?? null;
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load notes.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [api, query],
  );

  useEffect(() => {
    void loadNotes({ preserveSelection: true });
  }, [loadNotes]);

  // Keyboard shortcut: "/" focuses search. Ctrl/⌘+N creates a note.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const isInput =
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          (target instanceof HTMLElement && target.isContentEditable);
        if (isInput) return;
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        openCreate();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openCreate = () => {
    setEditorMode("create");
    setEditorOpen(true);
  };

  const openEdit = () => {
    if (!selectedNote) return;
    setEditorMode("edit");
    setEditorOpen(true);
  };

  const openDelete = () => {
    if (!selectedNote) return;
    setDeleteOpen(true);
  };

  const handleSave = async (payload: NoteCreateInput | NoteUpdateInput) => {
    if (editorMode === "create") {
      const created = await api.createNote(payload as NoteCreateInput);
      // Update UI optimistically; then reload to normalize ordering/filtering
      setNotes((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setEditorOpen(false);
      await loadNotes({ preserveSelection: true });
      return;
    }

    if (!selectedNote) return;
    const updated = await api.updateNote(
      selectedNote.id,
      payload as NoteUpdateInput,
    );
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setSelectedId(updated.id);
    setEditorOpen(false);
    await loadNotes({ preserveSelection: true });
  };

  const handleConfirmDelete = async () => {
    if (!selectedNote) return;
    const id = selectedNote.id;
    await api.deleteNote(id);
    setDeleteOpen(false);

    // Remove from current state immediately for snappy UX.
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelectedId((prev) => {
      if (prev !== id) return prev;
      const remaining = notes.filter((n) => n.id !== id);
      return remaining[0]?.id ?? null;
    });

    await loadNotes({ preserveSelection: false });
  };

  const headerSubtitle = useMemo(() => {
    if (loading) return "Loading…";
    if (error) return "Some actions may be unavailable.";
    return `${notes.length} note${notes.length === 1 ? "" : "s"}`;
  }, [loading, error, notes.length]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div
                className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h1 className="text-base font-semibold leading-tight">Notes</h1>
                <p className="text-xs text-slate-500">{headerSubtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => loadNotes({ preserveSelection: true })}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button variant="primary" onClick={openCreate}>
              New note
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          {/* Left pane: list */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="space-y-3 border-b border-slate-100 p-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <TextInput
                  id="search"
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search title or content… (press /)"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Tip: Ctrl/⌘+N to create a note
                </p>
                {q || tag ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQ("");
                      setTag("");
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>

              {/* Optional tag filtering */}
              {allTags.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">
                    Filter by tag
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Chip
                      label="All"
                      selected={!tag}
                      onClick={() => setTag("")}
                      ariaLabel="Show all tags"
                    />
                    {allTags.map((t) => (
                      <Chip
                        key={t}
                        label={t}
                        selected={tag === t}
                        onClick={() => setTag(t)}
                        ariaLabel={`Filter by tag ${t}`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="max-h-[65vh] overflow-auto">
              {loading ? (
                <div className="p-4 text-sm text-slate-600">
                  Loading notes…
                </div>
              ) : error ? (
                <div className="space-y-3 p-4">
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    role="alert"
                  >
                    {error}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => loadNotes({ preserveSelection: true })}
                  >
                    Retry
                  </Button>
                </div>
              ) : notes.length === 0 ? (
                <div className="p-6">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-blue-50/70 to-white p-4">
                    <p className="text-sm font-medium text-slate-900">
                      No notes yet
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Create your first note to get started.
                    </p>
                    <div className="mt-3">
                      <Button variant="primary" onClick={openCreate}>
                        Create a note
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {notes.map((n) => {
                    const isSelected = n.id === selectedId;
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={[
                            "w-full px-4 py-3 text-left transition-colors",
                            isSelected ? "bg-blue-50" : "hover:bg-slate-50",
                          ].join(" ")}
                          onClick={() => setSelectedId(n.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {n.title || "(Untitled)"}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                {n.content || "—"}
                              </p>
                              {n.tags.length ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {n.tags.slice(0, 3).map((t) => (
                                    <span
                                      key={t}
                                      className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                  {n.tags.length > 3 ? (
                                    <span className="text-[11px] text-slate-500">
                                      +{n.tags.length - 3}
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                            <span className="whitespace-nowrap text-[11px] text-slate-500">
                              {new Date(n.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Right pane: detail */}
          <section className="min-h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {selectedNote ? (
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-slate-900">
                      {selectedNote.title || "(Untitled)"}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Updated {new Date(selectedNote.updatedAt).toLocaleString()}
                    </p>
                    {selectedNote.tags.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedNote.tags.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="inline-flex items-center rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-100"
                            onClick={() => setTag(t)}
                            aria-label={`Filter by tag ${t}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={openEdit}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={openDelete}>
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-5">
                  {selectedNote.content ? (
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-800">
                      {selectedNote.content}
                    </pre>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      This note has no content yet. Click{" "}
                      <span className="font-medium">Edit</span> to add some.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-medium text-slate-900">
                    Select a note
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Choose a note from the list to view details, or create a new
                    one.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Button variant="primary" onClick={openCreate}>
                      New note
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => searchRef.current?.focus()}
                    >
                      Search
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <NoteEditorModal
        open={editorOpen}
        mode={editorMode}
        note={selectedNote}
        onCancel={() => setEditorOpen(false)}
        onSave={handleSave}
      />

      <DeleteConfirmModal
        open={deleteOpen}
        note={selectedNote}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
