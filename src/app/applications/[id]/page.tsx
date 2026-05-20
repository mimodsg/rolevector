import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  ApplicationDecisionFlag,
  applicationDecisionFromFit
} from "@/components/applications/application-decision-flag";
import { ApplicationStatusSelect } from "@/components/applications/application-status-select";
import { OptimizeApplicationButton } from "@/components/applications/optimize-application-button";
import { RegenerateApplicationButton } from "@/components/applications/regenerate-application-button";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ScoreCard } from "@/components/ui/score-card";
import { masterCvToOptimizationText } from "@/lib/master-cv-text";
import { masterCvSchema } from "@/lib/schemas/master-cv";
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

  return [...new Set([...sources, title, description, ...bodySentences].filter(Boolean))]
    .slice(0, 6);
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

  const cv = masterCvSchema.parse(application.optimizedCvJson);
  const optimizedCvText =
    application.optimizedCvText || masterCvToOptimizationText(cv);
  const scoreDelta = Number(
    (application.atsScore - application.baselineAtsScore).toFixed(1)
  );
  const isOptimized = Boolean(application.optimizedAt);
  const fit = fitAssessment(application.fitAssessment);
  const decision = applicationDecisionFromFit({
    fitAssessment: application.fitAssessment,
    fitScore: application.fitScore
  });
  const companyInsights = contextInsights(application.companyContext);
  const jobPageInsights = contextInsights(application.jobContext);
  const hasAiTailoringContext =
    application.companyUrl ||
    application.jobApplicationUrl ||
    companyInsights.length > 0 ||
    jobPageInsights.length > 0;

  return (
    <AppShell
      actions={
        <div className="flex flex-wrap gap-3">
          <RegenerateApplicationButton applicationId={application.id} />
          {isOptimized ? null : (
            <OptimizeApplicationButton applicationId={application.id} />
          )}
          <ButtonLink href={`/api/applications/${application.id}/pdf`} variant="highlight">
            Download PDFs
          </ButtonLink>
        </div>
      }
      title="Application Preview"
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="grid min-w-0 gap-6">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-title text-2xl uppercase text-rv-highlight">
                  {application.positionTitle ?? "Untitled position"}
                </h2>
                <p className="mt-2 text-rv-text-muted">
                  {application.companyName ?? "Unknown company"}
                </p>
              </div>
              <div className="min-w-48">
                <ApplicationStatusSelect
                  applicationId={application.id}
                  initialStatus={application.status}
                />
              </div>
            </div>
            <dl className="mt-6 grid gap-4 text-sm md:grid-cols-4">
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
            <h2 className="font-title text-xl uppercase text-rv-text">Optimized CV</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-rv-text-muted">
              {optimizedCvText}
            </p>
          </Panel>

          <Panel>
            <p className="whitespace-pre-wrap text-sm leading-6 text-rv-text-muted">
              {application.coverLetterText}
            </p>
          </Panel>
        </div>

        <aside className="grid min-w-0 max-w-full content-start gap-6 overflow-hidden">
          <Panel className="min-w-0 overflow-hidden">
            <h2 className="font-title text-xl uppercase text-rv-text">Apply Fit</h2>
            <div className="mt-4 rounded-rvmd border border-rv-border bg-rv-bg p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rv-text-muted">
                Application decision
              </p>
              <div className="mt-3">
                <ApplicationDecisionFlag {...decision} />
              </div>
              <p className="mt-3 break-words text-sm leading-6 text-rv-text-muted [overflow-wrap:anywhere]">
                {decision.decision === "Ready to submit"
                  ? "This role has strong alignment and no major risk flags. The application is worth submitting after your final review."
                  : decision.decision === "Worth optimizing"
                    ? "This role has enough alignment to justify tailoring the CV and cover letter before applying."
                    : "This role has low alignment or meaningful risk flags. It is likely better to prioritize another opportunity."}
              </p>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-title text-4xl text-rv-highlight">
                {application.fitScore ? application.fitScore.toFixed(1) : "-"}
              </span>
              <span className="text-sm font-bold text-rv-text-soft">
                {fit?.recommendation ?? "Not assessed"}
              </span>
            </div>
            {fit?.summary ? (
              <p className="mt-3 break-words text-sm leading-6 text-rv-text-muted [overflow-wrap:anywhere]">{fit.summary}</p>
            ) : null}
            {fit ? (
              <div className="mt-5 grid gap-4 text-sm">
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
          <ScoreCard
            score={application.atsScore.toFixed(1)}
            summary={
              isOptimized
                ? `Optimized from ${application.baselineAtsScore.toFixed(1)} to ${application.atsScore.toFixed(1)} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta}).`
                : "Baseline snapshot from your Master CV. Run optimization from this preview."
            }
          />
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
                <dd className="mt-1 text-rv-text-muted">
                  {isOptimized ? application.atsScore.toFixed(1) : "Not optimized yet"}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">Difference</dt>
                <dd className="mt-1 text-rv-text-muted">
                  {isOptimized ? `${scoreDelta >= 0 ? "+" : ""}${scoreDelta}` : "-"}
                </dd>
              </div>
            </dl>
          </Panel>
          <Panel className="min-w-0 overflow-hidden">
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
          <Panel className="min-w-0 overflow-hidden">
            <h2 className="font-title text-xl uppercase text-rv-text">Job Details</h2>
            {application.companyUrl || application.jobApplicationUrl ? (
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
            {application.companyContext || application.jobContext ? (
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
        </aside>
      </section>
    </AppShell>
  );
}
