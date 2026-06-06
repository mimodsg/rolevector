import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAgentScore,
  roleDecisionFromFitScore,
  shouldGenerateCvForAssessment,
  workflowStatusForOutcome
} from "../src/lib/services/cv-optimization-logic.ts";

test("role assessor thresholds map fit scores to the expected decisions", () => {
  assert.equal(roleDecisionFromFitScore(8), "optimize");
  assert.equal(roleDecisionFromFitScore(6), "optimize_with_caution");
  assert.equal(roleDecisionFromFitScore(4), "reject");
});

test("workflow generates CVs only for optimize and optimize_with_caution outcomes", () => {
  assert.equal(
    shouldGenerateCvForAssessment({ decision: "optimize", fitScore: 7 }),
    true
  );
  assert.equal(
    shouldGenerateCvForAssessment({
      decision: "optimize_with_caution",
      fitScore: 5
    }),
    true
  );
  assert.equal(
    shouldGenerateCvForAssessment({ decision: "reject", fitScore: 4 }),
    false
  );
});

test("workflow status branches correctly across skip, approve, and audit rejection", () => {
  assert.equal(
    workflowStatusForOutcome({
      assessment: { decision: "reject", fitScore: 3 },
      audits: []
    }),
    "skipped_low_fit"
  );
  assert.equal(
    workflowStatusForOutcome({
      assessment: { decision: "optimize", fitScore: 8 },
      audits: [{ approvedForExport: false }, { approvedForExport: true }]
    }),
    "approved"
  );
  assert.equal(
    workflowStatusForOutcome({
      assessment: { decision: "optimize_with_caution", fitScore: 5 },
      audits: [{ approvedForExport: false }, { approvedForExport: false }]
    }),
    "rejected_after_audit"
  );
});

test("agent scores are clamped to the required 1-10 range", () => {
  assert.equal(normalizeAgentScore(0), 1);
  assert.equal(normalizeAgentScore(11), 10);
  assert.equal(normalizeAgentScore(5.6), 6);
});
