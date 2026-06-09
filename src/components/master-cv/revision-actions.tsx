"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";

async function parseResponse<TPayload extends object>(response: Response) {
  const text = await response.text();
  let payload: { error?: string } = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error((payload.error ?? text) || `The request failed (${response.status}).`);
  }

  return payload as TPayload;
}

type RevisionVariant = "master" | "optimized";

function copyForVariant(variant: RevisionVariant) {
  if (variant === "master") {
    return {
      deleteDescription:
        "This deletes the selected Master CV revision permanently. This action cannot be reversed.",
      deleteTitle: "Delete Master CV Revision",
      overrideDescription:
        "This replaces the current Master CV with this revision. Before replacement, the current Master CV will be saved as a new revision.",
      overrideTitle: "Override Current Master CV",
      reviewHref: "/master-cv/revisions",
      routeBase: "/api/master-cv/revisions"
    };
  }

  return {
    deleteDescription:
      "This deletes the selected optimized CV revision permanently. This action cannot be reversed.",
    deleteTitle: "Delete Optimized CV Revision",
    overrideDescription:
      "This replaces the current Master CV with this optimized revision. Before replacement, the current Master CV will be saved as a new revision.",
    overrideTitle: "Override Current Master CV",
    reviewHref: "/master-cv/optimized-revisions",
    routeBase: "/api/master-cv/optimized"
  };
}

export function RevisionActions({
  id,
  isCurrent = false,
  variant
}: {
  id: string;
  isCurrent?: boolean;
  variant: RevisionVariant;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"delete" | "override" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    message: string;
    tone: "error" | "success" | "warning";
  } | null>(null);
  const copy = copyForVariant(variant);

  async function handleOverride() {
    setIsSubmitting(true);
    setStatus(null);

    try {
      await parseResponse<{ ok: true }>(
        await fetch(`${copy.routeBase}/${id}`, {
          method: "PUT"
        })
      );

      setStatus({
        message: "Current Master CV replaced successfully.",
        tone: "warning"
      });
      router.refresh();
    } catch (error) {
      setStatus({
        message:
          error instanceof Error ? error.message : "Unable to override the current Master CV.",
        tone: "error"
      });
    } finally {
      setIsSubmitting(false);
      setPendingAction(null);
    }
  }

  async function handleDelete() {
    setIsSubmitting(true);
    setStatus(null);

    try {
      await parseResponse<{ ok: true }>(
        await fetch(`${copy.routeBase}/${id}`, {
          method: "DELETE"
        })
      );

      setStatus({
        message: "Revision deleted successfully.",
        tone: "success"
      });
      router.refresh();
    } catch (error) {
      setStatus({
        message: error instanceof Error ? error.message : "Unable to delete the revision.",
        tone: "error"
      });
    } finally {
      setIsSubmitting(false);
      setPendingAction(null);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`${copy.reviewHref}/${id}`} variant="ghost">
          Review
        </ButtonLink>
        <Button
          disabled={isSubmitting}
          onClick={() => setPendingAction("override")}
          type="button"
          variant="highlight"
        >
          {isSubmitting && pendingAction === "override" ? "Replacing..." : "Override current master CV"}
        </Button>
        <Button
          disabled={isSubmitting || isCurrent}
          onClick={() => setPendingAction("delete")}
          type="button"
          variant="ghost"
        >
          {isSubmitting && pendingAction === "delete" ? "Deleting..." : "Delete"}
        </Button>
      </div>

      {status ? <Alert tone={status.tone}>{status.message}</Alert> : null}

      <ConfirmModal
        confirmLabel="Override current master CV"
        description={copy.overrideDescription}
        isOpen={pendingAction === "override"}
        onCancel={() => setPendingAction(null)}
        onConfirm={handleOverride}
        title={copy.overrideTitle}
      />

      <ConfirmModal
        confirmLabel="Delete revision"
        description={copy.deleteDescription}
        isOpen={pendingAction === "delete"}
        onCancel={() => setPendingAction(null)}
        onConfirm={handleDelete}
        title={copy.deleteTitle}
      />
    </div>
  );
}
