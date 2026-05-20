import { cn } from "@/lib/utils";

export type ApplicationDecision =
  | "Ready to submit"
  | "Worth optimizing"
  | "Explore another opportunity";

export type ApplicationDecisionTone = "danger" | "success" | "warning";

export function applicationDecisionFromFit({
  fitAssessment,
  fitScore
}: {
  fitAssessment: unknown;
  fitScore: number;
}): {
  decision: ApplicationDecision;
  tone: ApplicationDecisionTone;
} {
  const assessment =
    fitAssessment && typeof fitAssessment === "object"
      ? (fitAssessment as {
          decision?: unknown;
          decisionTone?: unknown;
          riskFlags?: unknown;
        })
      : {};
  const riskCount = Array.isArray(assessment.riskFlags)
    ? assessment.riskFlags.length
    : 0;

  if (
    assessment.decision === "Ready to submit" ||
    assessment.decision === "Worth optimizing" ||
    assessment.decision === "Explore another opportunity"
  ) {
    return {
      decision: assessment.decision,
      tone:
        assessment.decisionTone === "success" ||
        assessment.decisionTone === "warning" ||
        assessment.decisionTone === "danger"
          ? assessment.decisionTone
          : toneFor(assessment.decision)
    };
  }

  if (fitScore >= 8 && riskCount === 0) {
    return { decision: "Ready to submit", tone: "success" };
  }

  if (fitScore >= 6.5 && riskCount <= 1) {
    return { decision: "Worth optimizing", tone: "warning" };
  }

  return { decision: "Explore another opportunity", tone: "danger" };
}

export function ApplicationDecisionFlag({
  decision,
  tone
}: {
  decision: ApplicationDecision;
  tone: ApplicationDecisionTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-rvsm border px-2.5 py-1 text-xs font-bold",
        tone === "success" &&
          "border-rv-accent bg-rv-accent-soft text-rv-accent",
        tone === "warning" &&
          "border-rv-warning bg-rv-warning-soft text-rv-warning",
        tone === "danger" && "border-rv-error bg-rv-error-soft text-rv-error"
      )}
    >
      {decision}
    </span>
  );
}

function toneFor(decision: ApplicationDecision): ApplicationDecisionTone {
  if (decision === "Ready to submit") {
    return "success";
  }

  if (decision === "Worth optimizing") {
    return "warning";
  }

  return "danger";
}
