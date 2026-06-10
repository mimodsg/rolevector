import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  ApplicationDecisionFlag,
  applicationDecisionFromFit
} from "@/components/applications/application-decision-flag";
import { DiscardApplicationButton } from "@/components/applications/discard-application-button";
import { ApplicationStatusSelect } from "@/components/applications/application-status-select";
import { Alert, Tag } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ScoreCard } from "@/components/ui/score-card";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/server/session";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function contextInsights(context: string) {
  if (!context.trim()) {
    return [];
  }

  const sources = [...context.matchAll(/^Source:\s*(.+)$/gm)]
    .map((match) => `Source: ${match[1]?.trim()}`)
    .filter(Boolean);
  const title = context.match(/^Title:\s*(.+)$/m)?.[1]?.trim();
  const description = context.match(/^Description:\s*(.+)$/m)?.[1]?.trim();
  const body = context
    .replace(/^Source:\s*.+$/gm, "")
    .replace(/^Title:\s*.+$/m, "")
    .replace(/^Description:\s*.+$/m, "")
    .replace(/\s+/g, " ")
    .trim();
  const bodySentences = body
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 40)
    .slice(0, 4);

  return [...new Set([...sources, title, description, ...bodySentences].filter(Boolean))].slice(
    0,
    6
  );
}

function fitAssessment(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const assessment = value as {
    gaps?: unknown;
    decision?: unknown;
    decisionTone?: unknown;
    recommendation?: unknown;
    riskFlags?: unknown;
    strongMatches?: unknown;
    summary?: unknown;
  };

  return {
    decision:
      assessment.decision === "Ready to submit" ||
      assessment.decision === "Worth optimizing" ||
      assessment.decision === "Explore another opportunity"
        ? assessment.decision
        : "",
    decisionTone:
      assessment.decisionTone === "success" ||
      assessment.decisionTone === "warning" ||
      assessment.decisionTone === "danger"
        ? assessment.decisionTone
        : "",
    gaps: stringList(assessment.gaps),
    recommendation:
      typeof assessment.recommendation === "string"
        ? assessment.recommendation
        : "Not assessed",
    riskFlags: stringList(assessment.riskFlags),
    strongMatches: stringList(assessment.strongMatches),
    summary: typeof assessment.summary === "string" ? assessment.summary : ""
  };
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function analysisSnapshot(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const snapshot = value as {
    exportApproved?: unknown;
    fitDecision?: unknown;
    fitRecommendation?: unknown;
    fitScore?: unknown;
    stage?: unknown;
  };

  const stage =
    snapshot.stage === "assessment_rejected" ||
    snapshot.stage === "context_collected" ||
    snapshot.stage === "optimization_approved" ||
    snapshot.stage === "optimization_rejected"
      ? snapshot.stage
      : "";

  return {
    exportApproved: snapshot.exportApproved === true,
    fitDecision: typeof snapshot.fitDecision === "string" ? snapshot.fitDecision : "",
    fitRecommendation:
      typeof snapshot.fitRecommendation === "string" ? snapshot.fitRecommendation : "",
    fitScore: typeof snapshot.fitScore === "number" ? snapshot.fitScore : 0,
    stage
  };
}

function workflowState({
  fitScore,
  isOptimized,
  snapshot
}: {
  fitScore: number;
  isOptimized: boolean;
  snapshot: ReturnType<typeof analysisSnapshot>;
}) {
  if (snapshot?.stage === "optimization_approved" || snapshot?.exportApproved || isOptimized) {
    return {
      actionText: "Export Approved",
      canExport: true,
      description:
        "The stored application completed assessment, context collection, CV generation, and export review successfully.",
      stage: "auditor_approved" as const,
      tone: "success" as const
    };
  }

  if (snapshot?.stage === "optimization_rejected") {
    return {
      actionText: "Export Blocked",
      canExport: false,
      description:
        "The stored optimization workflow did not approve an export-ready application package.",
      stage: "auditor_rejected" as const,
      tone: "warning" as const
    };
  }

  if (snapshot?.stage === "assessment_rejected") {
    return {
      actionText: "Assessment Rejected",
      canExport: false,
      description:
        "This application was stored directly from the assessment step because the role did not clear the fit threshold.",
      stage: "assessor_rejected" as const,
      tone: "warning" as const
    };
  }

  if (isOptimized) {
    return {
      actionText: "Export Approved",
      canExport: true,
      description:
        "The Role Assessor, CV Editor, and CV Auditor completed successfully. Export is enabled.",
      stage: "auditor_approved" as const,
      tone: "success" as const
    };
  }

  if (fitScore < 5) {
    return {
      actionText: "Assessment Rejected",
      canExport: false,
      description:
        "This stored application did not clear the fit threshold and remains blocked from export.",
      stage: "assessor_rejected" as const,
      tone: "warning" as const
    };
  }

  return {
    actionText: "Awaiting Workflow",
    canExport: false,
    description:
      "The application has been assessed, but the CV workflow has not approved an export-ready version yet.",
    stage: "ready_for_optimization" as const,
    tone: "success" as const
  };
}

function atsCardState({
  fitDecision,
  isOptimized,
  workflowStage
}: {
  fitDecision: string;
  isOptimized: boolean;
  workflowStage:
    | "assessor_rejected"
    | "auditor_approved"
    | "auditor_rejected"
    | "ready_for_optimization";
}) {
  if (isOptimized) {
    return {
      headline: "Approved Export Snapshot",
      helperText: "ATS compatibility for the saved, export-ready CV.",
      label: "ATS Compatibility"
    };
  }

  if (workflowStage === "assessor_rejected") {
    return {
      headline: "Master CV Snapshot",
      helperText:
        "This reflects ATS compatibility for the current Master CV only. It does not decide whether the role is worth pursuing.",
      label: "Master CV ATS Compatibility"
    };
  }

  if (workflowStage === "auditor_rejected") {
    return {
      headline: "Rejected Draft Snapshot",
      helperText:
        "The workflow did not approve an export-ready CV. This score is shown for ATS reference only, not as the final application decision.",
      label: "ATS Compatibility Reference"
    };
  }

  return {
    headline:
      fitDecision === "Worth optimizing" ? "Pre-Workflow Snapshot" : "Master CV Snapshot",
    helperText:
      "Compatibility score from the current Master CV before an approved workflow run. This is separate from the role-fit decision.",
    label: "Master CV ATS Compatibility"
  };
}

export default async function ApplicationPreviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireCurrentUserId();
  const { id } = await params;
  const application = await prisma.application.findFirst({
    where: { id, userId }
  });

  if (!application) {
    notFound();
  }

  const scoreDelta = Number(
    (application.atsScore - application.baselineAtsScore).toFixed(1)
  );
  const isOptimized = Boolean(application.optimizedAt);
  const fit = fitAssessment(application.fitAssessment);
  const snapshot = analysisSnapshot(application.analysisSnapshot);
  const decision = applicationDecisionFromFit({
    fitAssessment: application.fitAssessment,
    fitScore: application.fitScore
  });
  const workflow = workflowState({
    fitScore: application.fitScore,
    isOptimized,
    snapshot
  });
  const atsCard = atsCardState({
    fitDecision: decision.decision,
    isOptimized,
    workflowStage: workflow.stage
  });
  const showTailoringContext = workflow.stage !== "assessor_rejected";
  const companyInsights = contextInsights(application.companyContext);
  const jobPageInsights = contextInsights(application.jobContext);
  const hasAiTailoringContext =
    showTailoringContext &&
    (application.companyUrl ||
      application.jobApplicationUrl ||
      companyInsights.length > 0 ||
      jobPageInsights.length > 0);
  const afterOptimizationLabel = isOptimized
    ? application.atsScore.toFixed(1)
    : workflow.stage === "auditor_rejected"
      ? "Rejected by CV Auditor"
      : workflow.stage === "assessor_rejected"
        ? "Stopped by Role Assessor"
        : "Not optimized yet";

  return (
    <AppShell title="Application Preview">
      <section className="grid gap-6">
        <Panel>
          <h2 className="font-title text-xl uppercase text-rv-text">Application Details</h2>
          <div className="mt-4">
            <h3 className="font-title text-2xl uppercase text-rv-highlight">
              {application.positionTitle ?? "Untitled position"}
            </h3>
            <p className="mt-2 text-rv-text-muted">
              {application.companyName ?? "Unknown company"}
            </p>
          </div>
          <dl className="mt-6 grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
            <div>
              <dt className="font-bold text-rv-text-soft">Application date</dt>
              <dd className="mt-1 text-rv-text-muted">{formatDate(application.createdAt)}</dd>
            </div>
            <div>
              <dt className="font-bold text-rv-text-soft">Salary</dt>
              <dd className="mt-1 text-rv-text-muted">{application.salary || "-"}</dd>
            </div>
            <div>
              <dt className="font-bold text-rv-text-soft">Before score</dt>
              <dd className="mt-1 text-rv-text-muted">
                {application.baselineAtsScore.toFixed(1)}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-rv-text-soft">Current score</dt>
              <dd className="mt-1 text-rv-text-muted">{application.atsScore.toFixed(1)}</dd>
            </div>
          </dl>
        </Panel>

        <Panel>
          <h2 className="font-title text-xl uppercase text-rv-text">Operations</h2>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,220px)_1fr_auto] xl:items-start">
            <div className="min-w-0">
              <ApplicationStatusSelect
                applicationId={application.id}
                initialStatus={application.status}
              />
            </div>
            <div className="min-w-0">
              {workflow.canExport ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Tag tone="authenticated">Export Ready</Tag>
                  <span className="text-rv-text-muted">
                    The application package is approved and ready to download.
                  </span>
                </div>
              ) : (
                <Alert tone={workflow.tone}>
                  <div className="flex flex-wrap items-center gap-3">
                    <Tag>{workflow.actionText}</Tag>
                    <span className="font-semibold">PDF export is currently disabled.</span>
                  </div>
                  <p className="mt-3">{workflow.description}</p>
                </Alert>
              )}
            </div>
            <div className="flex flex-wrap justify-start gap-3 xl:justify-end">
              {workflow.canExport ? (
                <ButtonLink href={`/api/applications/${application.id}/pdf`} variant="highlight">
                  Download PDFs
                </ButtonLink>
              ) : null}
              <DiscardApplicationButton
                applicationId={application.id}
                status={application.status}
              />
            </div>
          </div>
        </Panel>

        <div className="grid min-w-0 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Panel className="min-w-0 overflow-hidden">
            <h2 className="font-title text-xl uppercase text-rv-text">Workflow Status</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Tag>Role Assessor</Tag>
              <Tag tone={workflow.stage === "assessor_rejected" ? "admin" : "authenticated"}>
                {decision.decision}
              </Tag>
              <Tag tone={workflow.stage === "auditor_approved" ? "authenticated" : "neutral"}>
                {isOptimized ? "CV Auditor Approved" : "CV Auditor Pending"}
              </Tag>
            </div>
            <p className="mt-4 text-sm leading-6 text-rv-text-muted">
              {workflow.description}
            </p>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-bold text-rv-text-soft">Assessment</dt>
                <dd className="mt-1 text-rv-text-muted">{decision.decision}</dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">Generation status</dt>
                <dd className="mt-1 text-rv-text-muted">
                  {isOptimized ? "Approved CV saved" : "No export-ready CV saved"}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">Export status</dt>
                <dd className="mt-1 text-rv-text-muted">
                  {workflow.canExport ? "Enabled" : "Blocked until approval"}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel className="min-w-0 overflow-hidden">
            <h2 className="font-title text-xl uppercase text-rv-text">
              Application Decision
            </h2>
            <div className="mt-4">
              <ApplicationDecisionFlag {...decision} />
            </div>
            <p className="mt-4 break-words text-sm leading-6 text-rv-text-muted [overflow-wrap:anywhere]">
              {decision.decision === "Ready to submit"
                ? "This role has strong alignment and no major risk flags. The application is worth submitting after your final review."
                : decision.decision === "Worth optimizing"
                  ? "This role has enough alignment to justify tailoring before applying."
                  : "This role has low alignment or meaningful risk flags. It is likely better to prioritize another opportunity."}
            </p>
          </Panel>

          <div className="min-w-0">
            <ScoreCard
              headline={atsCard.headline}
              helperText={atsCard.helperText}
              label={atsCard.label}
              score={application.atsScore.toFixed(1)}
              summary={
                isOptimized
                  ? `Optimized from ${application.baselineAtsScore.toFixed(1)} to ${application.atsScore.toFixed(1)} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta}).`
                  : workflow.stage === "assessor_rejected"
                    ? "Baseline snapshot retained because the Role Assessor did not recommend proceeding."
                    : workflow.stage === "auditor_rejected"
                      ? "Baseline snapshot retained because the CV Auditor did not approve export."
                      : "Baseline snapshot from the stored application workflow."
              }
            />
          </div>
        </div>

        <div className="grid min-w-0 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Panel className="min-w-0 overflow-hidden">
            <h2 className="font-title text-xl uppercase text-rv-text">Application Fit</h2>
            <p className="mt-2 text-sm leading-6 text-rv-text-muted">
              Role Assessor score used to decide whether this application should move
              forward in the workflow.
            </p>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-title text-4xl text-rv-highlight">
                {application.fitScore ? application.fitScore.toFixed(1) : "-"}
              </span>
              <span className="text-sm font-bold text-rv-text-soft">
                {fit?.recommendation ?? "Not assessed"}
              </span>
            </div>
            {fit?.summary ? (
              <p className="mt-3 break-words text-sm leading-6 text-rv-text-muted [overflow-wrap:anywhere]">
                {fit.summary}
              </p>
            ) : null}
          </Panel>

          <Panel className="min-w-0 overflow-hidden md:col-span-2 xl:col-span-2">
            <h2 className="font-title text-xl uppercase text-rv-text">
              Application Fit Details
            </h2>
            {fit ? (
              <div className="mt-4 grid gap-6 text-sm md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <h3 className="font-bold text-rv-text-soft">Strong matches</h3>
                  {fit.strongMatches.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-2 break-words pl-5 leading-6 text-rv-text-muted [overflow-wrap:anywhere]">
                      {fit.strongMatches.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-rv-text-muted">No strong matches identified.</p>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-rv-text-soft">Gaps to review</h3>
                  {fit.gaps.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-2 break-words pl-5 leading-6 text-rv-text-muted [overflow-wrap:anywhere]">
                      {fit.gaps.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-rv-text-muted">No major gaps identified.</p>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-rv-text-soft">Risk flags</h3>
                  {fit.riskFlags.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-2 break-words pl-5 leading-6 text-rv-text-muted [overflow-wrap:anywhere]">
                      {fit.riskFlags.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-rv-text-muted">No major risk flags identified.</p>
                  )}
                </div>
              </div>
            ) : null}
          </Panel>
        </div>

        {showTailoringContext ? (
          <div className="grid min-w-0 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Panel className="min-w-0 overflow-hidden">
            <h2 className="font-title text-xl uppercase text-rv-text">Score Comparison</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-bold text-rv-text-soft">Before optimization</dt>
                <dd className="mt-1 text-rv-text-muted">
                  {application.baselineAtsScore.toFixed(1)}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">After optimization</dt>
                <dd className="mt-1 text-rv-text-muted">{afterOptimizationLabel}</dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">Difference</dt>
                <dd className="mt-1 text-rv-text-muted">
                  {isOptimized ? `${scoreDelta >= 0 ? "+" : ""}${scoreDelta}` : "-"}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel className="min-w-0 overflow-hidden md:col-span-2 xl:col-span-2">
            <h2 className="font-title text-xl uppercase text-rv-text">
              AI Tailoring Context
            </h2>
            {hasAiTailoringContext ? (
              <div className="mt-4 grid min-w-0 gap-5 text-sm">
                <div className="flex flex-wrap gap-2">
                  {application.companyUrl ? (
                    <ButtonLink
                      className="min-h-9 px-3 py-1.5 text-xs"
                      href={application.companyUrl}
                      rel="noreferrer"
                      target="_blank"
                      variant="ghost"
                    >
                      View company page
                    </ButtonLink>
                  ) : null}
                  {application.jobApplicationUrl ? (
                    <ButtonLink
                      className="min-h-9 px-3 py-1.5 text-xs"
                      href={application.jobApplicationUrl}
                      rel="noreferrer"
                      target="_blank"
                      variant="ghost"
                    >
                      View job post
                    </ButtonLink>
                  ) : null}
                </div>
                <div>
                  <h3 className="font-bold text-rv-text-soft">Company insights</h3>
                  {companyInsights.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-2 break-words pl-5 leading-6 text-rv-text-muted [overflow-wrap:anywhere]">
                      {companyInsights.map((insight) => (
                        <li key={insight}>{insight}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 leading-6 text-rv-text-muted">
                      No company page text was captured.
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-rv-text-soft">Job page insights</h3>
                  {jobPageInsights.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-2 break-words pl-5 leading-6 text-rv-text-muted [overflow-wrap:anywhere]">
                      {jobPageInsights.map((insight) => (
                        <li key={insight}>{insight}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 leading-6 text-rv-text-muted">
                      No job page text was captured beyond the pasted job details.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-rv-text-muted">
                No URL context was added for this application.
              </p>
            )}
          </Panel>
          </div>
        ) : (
          <div className="grid min-w-0 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Panel className="min-w-0 overflow-hidden">
              <h2 className="font-title text-xl uppercase text-rv-text">Score Comparison</h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="font-bold text-rv-text-soft">Before optimization</dt>
                  <dd className="mt-1 text-rv-text-muted">
                    {application.baselineAtsScore.toFixed(1)}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-rv-text-soft">After optimization</dt>
                  <dd className="mt-1 text-rv-text-muted">{afterOptimizationLabel}</dd>
                </div>
                <div>
                  <dt className="font-bold text-rv-text-soft">Difference</dt>
                  <dd className="mt-1 text-rv-text-muted">
                    {isOptimized ? `${scoreDelta >= 0 ? "+" : ""}${scoreDelta}` : "-"}
                  </dd>
                </div>
              </dl>
            </Panel>
          </div>
        )}

        <Panel className="min-w-0 overflow-hidden">
          <h2 className="font-title text-xl uppercase text-rv-text">Job Details</h2>
          {showTailoringContext && (application.companyUrl || application.jobApplicationUrl) ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {application.companyUrl ? (
                <ButtonLink
                  className="min-h-9 px-3 py-1.5 text-xs"
                  href={application.companyUrl}
                  rel="noreferrer"
                  target="_blank"
                  variant="ghost"
                >
                  View company page
                </ButtonLink>
              ) : null}
              {application.jobApplicationUrl ? (
                <ButtonLink
                  className="min-h-9 px-3 py-1.5 text-xs"
                  href={application.jobApplicationUrl}
                  rel="noreferrer"
                  target="_blank"
                  variant="ghost"
                >
                  View job post
                </ButtonLink>
              ) : null}
            </div>
          ) : null}
          <p className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-rv-text-muted [overflow-wrap:anywhere]">
            {application.jobDetails}
          </p>
          {showTailoringContext && (application.companyContext || application.jobContext) ? (
            <div className="mt-4 grid gap-4 text-sm">
              {application.companyContext ? (
                <div>
                  <h3 className="font-bold text-rv-text-soft">Company context</h3>
                  <p className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words leading-6 text-rv-text-muted [overflow-wrap:anywhere]">
                    {application.companyContext}
                  </p>
                </div>
              ) : null}
              {application.jobContext ? (
                <div>
                  <h3 className="font-bold text-rv-text-soft">Job page context</h3>
                  <p className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words leading-6 text-rv-text-muted [overflow-wrap:anywhere]">
                    {application.jobContext}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </Panel>
      </section>
    </AppShell>
  );
}
