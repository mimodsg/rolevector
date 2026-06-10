"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { ApplicationStatusValue } from "@/lib/schemas/application";

export function DiscardApplicationButton({
  applicationId,
  status
}: {
  applicationId: string;
  status: ApplicationStatusValue;
}) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isDropped = status === "Dropped";

  async function discardApplication() {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Dropped" })
      });

      if (!response.ok) {
        throw new Error("Unable to discard application.");
      }

      setIsConfirmOpen(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Button
        disabled={isSaving || isDropped}
        onClick={() => setIsConfirmOpen(true)}
        type="button"
        variant="ghost"
      >
        {isDropped ? "Application discarded" : "Discard application"}
      </Button>
      <ConfirmModal
        cancelLabel="Keep application"
        confirmLabel={isSaving ? "Discarding..." : "Discard application"}
        description="This will mark the application as dropped and keep it out of your active pipeline. The record will remain available for reference."
        isOpen={isConfirmOpen}
        onCancel={() => {
          if (!isSaving) {
            setIsConfirmOpen(false);
          }
        }}
        onConfirm={() => {
          if (!isSaving) {
            void discardApplication();
          }
        }}
        title="Discard Application"
      />
    </>
  );
}
