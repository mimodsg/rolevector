"use client";

import { useEffect } from "react";
import { Button } from "./button";

export function ConfirmModal({
  cancelLabel = "Cancel",
  confirmLabel = "Continue",
  description,
  isOpen,
  onCancel,
  onConfirm,
  title
}: {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="confirm-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-rvlg border border-rv-border bg-[linear-gradient(145deg,var(--color-surface),#393535)] p-6 shadow-rvmd">
        <h2 className="font-title text-2xl uppercase text-rv-highlight" id="confirm-modal-title">
          {title}
        </h2>
        <p className="mt-4 text-sm leading-6 text-rv-text-muted">{description}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button onClick={onCancel} type="button" variant="ghost">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} type="button" variant="highlight">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
