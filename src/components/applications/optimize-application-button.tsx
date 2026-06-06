"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export function OptimizeApplicationButton({
  applicationId,
  confirmMessage,
  confirmTitle = "Proceed With Workflow?",
  label = "Run CV Workflow"
}: {
  applicationId: string;
  confirmMessage?: string;
  confirmTitle?: string;
  label?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  async function runWorkflow() {
    setError(null);
    setIsConfirmOpen(false);
    setIsOptimizing(true);

    try {
      const response = await fetch(`/api/applications/${applicationId}/optimize`, {
        method: "POST"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);

        throw new Error(payload?.error ?? "Unable to optimize application.");
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to optimize application."
      );
    } finally {
      setIsOptimizing(false);
    }
  }

  function optimize() {
    if (confirmMessage) {
      setIsConfirmOpen(true);
      return;
    }

    void runWorkflow();
  }

  return (
    <>
      <div className="grid gap-2">
        <Button disabled={isOptimizing} onClick={optimize} type="button">
          {isOptimizing ? "Running Workflow..." : label}
        </Button>
        {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
      </div>
      <ConfirmModal
        confirmLabel="Run Workflow"
        description={confirmMessage ?? ""}
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => void runWorkflow()}
        title={confirmTitle}
      />
    </>
  );
}
