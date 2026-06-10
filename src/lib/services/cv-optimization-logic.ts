export type RoleAssessmentDecision =
  | "optimize"
  | "optimize_with_caution"
  | "reject";

export type WorkflowStatus =
  | "approved"
  | "rejected_after_audit"
  | "skipped_low_fit";

export type WorkflowAssessment = {
  decision: RoleAssessmentDecision;
  fitScore: number;
};

export type WorkflowAudit = {
  approvedForExport: boolean;
};

export function normalizeAgentScore(score: number) {
  if (!Number.isFinite(score)) {
    return 1;
  }

  return Math.min(10, Math.max(1, Math.round(score)));
}

export function roleDecisionFromFitScore(fitScore: number): RoleAssessmentDecision {
  const normalized = normalizeAgentScore(fitScore);

  if (normalized >= 7) {
    return "optimize";
  }

  if (normalized >= 5) {
    return "optimize_with_caution";
  }

  return "reject";
}

export function shouldGenerateCvForAssessment(assessment: WorkflowAssessment) {
  void assessment;
  return true;
}

export function workflowStatusForOutcome({
  assessment,
  audits
}: {
  assessment: WorkflowAssessment;
  audits: WorkflowAudit[];
}): WorkflowStatus {
  void assessment;
  void audits;

  return "approved";
}
