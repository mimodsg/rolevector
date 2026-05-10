"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function OptimizeApplicationButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  async function optimize() {
    setError(null);
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

  return (
    <div className="grid gap-2">
      <Button disabled={isOptimizing} onClick={optimize} type="button">
        {isOptimizing ? "Optimizing..." : "Optimize CV"}
      </Button>
      {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}
