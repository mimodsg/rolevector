"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui/field";
import {
  applicationStatusSchema,
  type ApplicationStatusValue
} from "@/lib/schemas/application";

const statusOptions = applicationStatusSchema.options;

export function ApplicationStatusSelect({
  applicationId,
  initialStatus
}: {
  applicationId: string;
  initialStatus: ApplicationStatusValue;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatusValue>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);

  async function updateStatus(nextStatus: ApplicationStatusValue) {
    setStatus(nextStatus);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!response.ok) {
        throw new Error("Unable to update application status.");
      }

      router.refresh();
    } catch {
      setStatus(initialStatus);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Select
      aria-label="Application status"
      disabled={isSaving}
      onChange={(event) => updateStatus(event.currentTarget.value as ApplicationStatusValue)}
      value={status}
    >
      {statusOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </Select>
  );
}
