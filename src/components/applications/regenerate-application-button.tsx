"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RegenerateApplicationButton({
  applicationId
}: {
  applicationId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  async function regenerate() {
    setError(null);
    setIsRegenerating(true);

    try {
      const response = await fetch(`/api/applications/${applicationId}/regenerate`, {
        method: "POST"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);

        throw new Error(payload?.error ?? "Unable to regenerate application CV.");
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to regenerate application CV."
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        disabled={isRegenerating}
        onClick={regenerate}
        type="button"
        variant="ghost"
      >
        {isRegenerating ? "Regenerating..." : "Regenerate CV"}
      </Button>
      {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}
