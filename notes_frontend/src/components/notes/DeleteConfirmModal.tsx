"use client";

import React, { useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Note } from "@/lib/types";

export function DeleteConfirmModal(props: {
  open: boolean;
  note: Note | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { open, note, onCancel, onConfirm } = props;
  const [submitting, setSubmitting] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Delete note?"
      description="This action cannot be undone."
      onClose={onCancel}
      initialFocusRef={confirmRef}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={submitting}
            ref={confirmRef}
          >
            {submitting ? "Deleting…" : "Delete"}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <p className="text-sm text-slate-700">
          You are about to delete{" "}
          <span className="font-semibold text-slate-900">
            {note?.title ?? "this note"}
          </span>
          .
        </p>
      </div>
    </Modal>
  );
}
