"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function OptimizeApplicationButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [isOptimizing, setIsOptimizing] = useState(false);

  async function optimize() {
    setIsOptimizing(true);

    try {
      const response = await fetch(`/api/applications/${applicationId}/optimize`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Unable to optimize application.");
      }

      router.refresh();
    } finally {
      setIsOptimizing(false);
    }
  }

  return (
    <Button disabled={isOptimizing} onClick={optimize} type="button">
      {isOptimizing ? "Optimizing..." : "Optimize CV"}
    </Button>
  );
}
