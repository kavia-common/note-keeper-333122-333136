"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label, TextArea, TextInput } from "@/components/ui/Fields";
import type { Note, NoteCreateInput, NoteUpdateInput } from "@/lib/types";

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function NoteEditorModal(props: {
  open: boolean;
  mode: "create" | "edit";
  note?: Note | null;
  onCancel: () => void;
  onSave: (payload: NoteCreateInput | NoteUpdateInput) => Promise<void>;
}) {
  const { open, mode, note, onCancel, onSave } = props;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | undefined>(undefined);

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    setFormError(null);
    setSubmitting(false);
    setTitleError(undefined);

    if (mode === "edit" && note) {
      setTitle(note.title);
      setContent(note.content);
      setTagsRaw(note.tags.join(", "));
    } else {
      setTitle("");
      setContent("");
      setTagsRaw("");
    }
  }, [open, mode, note]);

  const header = useMemo(() => {
    return mode === "create" ? "New note" : "Edit note";
  }, [mode]);

  const description = useMemo(() => {
    return mode === "create"
      ? "Capture a thought. You can add optional tags separated by commas."
      : "Update your note. Tags are optional and comma-separated.";
  }, [mode]);

  const handleSubmit = async () => {
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError("Title is required.");
      titleInputRef.current?.focus();
      return;
    }

    setTitleError(undefined);

    setSubmitting(true);
    try {
      await onSave({
        title: trimmedTitle,
        content: content.trim(),
        tags: parseTags(tagsRaw),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save note.";
      setFormError(message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  };

  return (
    <Modal
      open={open}
      title={header}
      description={description}
      onClose={onCancel}
      initialFocusRef={titleInputRef}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {formError}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="note-title">Title</Label>
          <TextInput
            id="note-title"
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Meeting notes"
            error={titleError}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note-tags">Tags (optional)</Label>
          <TextInput
            id="note-tags"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="e.g., work, ideas, todo"
          />
          <p className="text-xs text-slate-500">Separate tags with commas.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note-content">Content</Label>
          <TextArea
            id="note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write something…"
          />
        </div>
      </div>
    </Modal>
  );
}
