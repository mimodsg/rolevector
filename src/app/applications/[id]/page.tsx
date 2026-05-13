import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  AnalysisPanel,
  KeywordList,
  MatchBreakdown,
  OverviewScoreBand,
  ScoreRing,
  SectionScoreGrid
} from "@/components/applications/application-analysis-widgets";
import { ApplicationPreviewTabs } from "@/components/applications/application-preview-tabs";
import { ApplicationStatusSelect } from "@/components/applications/application-status-select";
import { OptimizeApplicationButton } from "@/components/applications/optimize-application-button";
import { RegenerateApplicationButton } from "@/components/applications/regenerate-application-button";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { masterCvToOptimizationText } from "@/lib/master-cv-text";
import { prisma } from "@/lib/prisma";
import { parsedJobSchema } from "@/lib/schemas/job";
import { masterCvSchema } from "@/lib/schemas/master-cv";
import { requireCurrentUserId } from "@/lib/server/session";
import {
  applicationAnalysisSnapshot,
  buildApplicationAnalysisSnapshot
} from "@/lib/services/application-analysis";
import { assessApplicationFit } from "@/lib/services/application-fit";
import { scoreAtsCompatibility } from "@/lib/services/ats-scoring";

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

  return [
    ...new Set(
      [...sources, title, description, ...bodySentences].filter(
        (item): item is string => typeof item === "string" && item.length > 0
      )
    )
  ]
    .slice(0, 6);
}

function fitAssessment(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const assessment = value as {
    gaps?: unknown;
    recommendation?: unknown;
    riskFlags?: unknown;
    strongMatches?: unknown;
    summary?: unknown;
  };

  return {
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
  const companyInsights = contextInsights(application.companyContext);
  const jobPageInsights = contextInsights(application.jobContext);
  const parsedJob = parsedJobSchema.parse(application.parsedMetadata);
  const applicationContext = {
    companyContext: application.companyContext,
    companyUrl: application.companyUrl,
    jobApplicationUrl: application.jobApplicationUrl,
    jobContext: application.jobContext
  };
  const fallbackFitAssessment = assessApplicationFit({
    applicationContext,
    masterCv: cv,
    parsedJob
  });
  const rawSnapshot = applicationAnalysisSnapshot(application.analysisSnapshot);
  const snapshot =
    rawSnapshot.scores.overall > 0
      ? rawSnapshot
      : buildApplicationAnalysisSnapshot({
          atsBreakdown: scoreAtsCompatibility(cv, parsedJob),
          baselineAtsScore: application.baselineAtsScore,
          currentAtsScore: application.atsScore,
          fitAssessment: fallbackFitAssessment,
          isOptimized,
          masterCv: cv,
          parsedJob
        });
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
          <ButtonLink href={`/api/applications/${application.id}/pdf`} variant="secondary">
            Download PDFs
          </ButtonLink>
          <ButtonLink href="/applications" variant="ghost">
            Back to Applications
          </ButtonLink>
        </div>
      }
      title="Application Analysis"
    >
      <section className="grid gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-title text-4xl font-medium uppercase text-rv-text">
              {application.positionTitle ?? "Untitled position"}
            </h2>
            <p className="mt-2 text-rv-text-soft">
              {application.companyName ?? "Unknown company"}
              {application.salary ? ` - ${application.salary}` : ""}
            </p>
          </div>
          <div className="min-w-52">
            <ApplicationStatusSelect
              applicationId={application.id}
              initialStatus={application.status}
            />
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-6">
            <OverviewScoreBand isOptimized={isOptimized} snapshot={snapshot} />

            <ApplicationPreviewTabs
              tabs={[
                {
                  content: (
                    <div className="grid gap-6">
                      <section className="grid gap-6 lg:grid-cols-2">
                        <AnalysisPanel title="Resume Analysis">
                          <p className="text-sm leading-6 text-rv-text-muted">
                            {snapshot.summary}
                          </p>
                          <h3 className="mt-6 font-bold text-rv-text-soft">
                            Strengths
                          </h3>
                          <SignalList items={snapshot.strengths} tone="success" />
                          <h3 className="mt-6 font-bold text-rv-text-soft">
                            Areas to Improve
                          </h3>
                          <SignalList items={snapshot.improvementAreas} tone="warning" />
                          <h3 className="mt-6 font-bold text-rv-text-soft">
                            Recommendation
                          </h3>
                          <p className="mt-3 text-sm leading-6 text-rv-text-muted">
                            {snapshot.recommendation}
                          </p>
                        </AnalysisPanel>

                        <div className="grid gap-6">
                          <AnalysisPanel title="Match Breakdown">
                            <MatchBreakdown snapshot={snapshot} />
                          </AnalysisPanel>
                          <AnalysisPanel title="Top Strengths">
                            <KeywordList
                              keywords={snapshot.topStrengths.map((label) => ({
                                label,
                                status: "matched"
                              }))}
                            />
                          </AnalysisPanel>
                          <AnalysisPanel title="Improvement Areas">
                            <KeywordList
                              keywords={snapshot.improvementAreas.map((label) => ({
                                label,
                                status: "recommended"
                              }))}
                            />
                          </AnalysisPanel>
                        </div>
                      </section>

                      <AnalysisPanel title="Recommended Keywords">
                        <KeywordList keywords={snapshot.recommendedKeywords} />
                      </AnalysisPanel>

                      <AnalysisPanel title="Application Sections Analysis">
                        <SectionScoreGrid sections={snapshot.sections} />
                      </AnalysisPanel>
                    </div>
                  ),
                  id: "overview",
                  label: "Analysis Overview"
                },
                {
                  content: (
                    <AnalysisPanel title="Job Details">
                      <SourceLinks application={application} />
                      <p className="max-h-[560px] overflow-auto whitespace-pre-wrap text-sm leading-6 text-rv-text-muted">
                        {application.jobDetails}
                      </p>
                    </AnalysisPanel>
                  ),
                  id: "job-details",
                  label: "Job Details"
                },
                {
                  content: (
                    <AnalysisPanel title="Optimized CV">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-rv-text-muted">
                        {optimizedCvText}
                      </p>
                    </AnalysisPanel>
                  ),
                  id: "optimized-cv",
                  label: "Optimized CV"
                },
                {
                  content: (
                    <AnalysisPanel title="Cover Letter">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-rv-text-muted">
                        {application.coverLetterText}
                      </p>
                    </AnalysisPanel>
                  ),
                  id: "cover-letter",
                  label: "Cover Letter"
                },
                {
                  content: (
                    <AnalysisPanel title="Company Insights">
                      <SignalList items={companyInsights} tone="info" />
                    </AnalysisPanel>
                  ),
                  id: "company-insights",
                  label: "Company Insights"
                },
                {
                  content: (
                    <AnalysisPanel title="Job Page Insights">
                      <SignalList items={jobPageInsights} tone="info" />
                    </AnalysisPanel>
                  ),
                  id: "job-page-insights",
                  label: "Job Page Insights"
                }
              ]}
            />
          </div>

          <aside className="grid content-start gap-6">
            <Panel>
              <h2 className="font-title text-xl font-medium uppercase text-rv-text">
                Analysis Details
              </h2>
              <dl className="mt-5 grid gap-4 text-sm">
                <Detail label="Job Title" value={application.positionTitle ?? "Untitled position"} />
                <Detail label="Company" value={application.companyName ?? "Unknown company"} />
                <Detail label="Application Date" value={formatDate(application.createdAt)} />
                <Detail
                  label="Date Optimized"
                  value={application.optimizedAt ? formatDate(application.optimizedAt) : "Not optimized"}
                />
                <Detail label="Status" value={application.status} />
                <Detail
                  label="Analysis ID"
                  value={`RV-${application.id.slice(-8).toUpperCase()}`}
                />
              </dl>
            </Panel>

            <Panel className="text-center">
              <h2 className="font-title text-xl font-medium uppercase text-rv-text">
                Compatibility
              </h2>
              <div className="mt-5 flex justify-center">
                <ScoreRing
                  label={isOptimized ? "Optimized" : "Baseline"}
                  score={snapshot.scores.atsCompatibility}
                />
              </div>
              <p className="mt-4 text-sm leading-6 text-rv-text-muted">
                {isOptimized
                  ? `ATS score moved from ${application.baselineAtsScore.toFixed(1)} to ${application.atsScore.toFixed(1)} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta}).`
                  : "Run optimization to compare the baseline CV against the tailored version."}
              </p>
            </Panel>

            <Panel>
              <h2 className="font-title text-xl font-medium uppercase text-rv-text">
                Apply Fit
              </h2>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-title text-4xl font-medium text-rv-text">
                  {application.fitScore ? application.fitScore.toFixed(1) : "-"}
                </span>
                <span className="text-sm font-bold text-rv-text-soft">
                  {fit?.recommendation ?? "Not assessed"}
                </span>
              </div>
              {fit?.summary ? (
                <p className="mt-3 text-sm leading-6 text-rv-text-muted">
                  {fit.summary}
                </p>
              ) : null}
            </Panel>

            <Panel>
              <h2 className="font-title text-xl font-medium uppercase text-rv-text">
                AI Tailoring Context
              </h2>
              {hasAiTailoringContext ? (
                <dl className="mt-4 grid gap-4 text-sm">
                  {application.companyUrl ? (
                    <Detail label="Company Source" value={application.companyUrl} />
                  ) : null}
                  {application.jobApplicationUrl ? (
                    <Detail label="Job Source" value={application.jobApplicationUrl} />
                  ) : null}
                  <Detail
                    label="Company Insights"
                    value={`${companyInsights.length} captured`}
                  />
                  <Detail
                    label="Job Page Insights"
                    value={`${jobPageInsights.length} captured`}
                  />
                </dl>
              ) : (
                <p className="mt-4 text-sm leading-6 text-rv-text-muted">
                  No URL context was added for this application.
                </p>
              )}
            </Panel>
          </aside>
        </section>
      </section>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-title text-xs font-medium uppercase tracking-wide text-rv-primary-light">
        {label}
      </dt>
      <dd className="mt-1 break-words text-rv-text-soft">{value}</dd>
    </div>
  );
}

function SignalList({
  items,
  tone
}: {
  items: string[];
  tone: "info" | "success" | "warning";
}) {
  const color =
    tone === "warning"
      ? "bg-rv-warning"
      : tone === "info"
        ? "bg-rv-info"
        : "bg-rv-accent";

  if (items.length === 0) {
    return (
      <p className="mt-3 text-sm leading-6 text-rv-text-muted">
        No signals available yet.
      </p>
    );
  }

  return (
    <ul className="mt-3 grid gap-2 text-sm leading-6 text-rv-text-muted">
      {items.map((item) => (
        <li className="flex gap-2" key={item}>
          <span className={`mt-2 size-1.5 shrink-0 rounded-full ${color}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SourceLinks({
  application
}: {
  application: {
    companyUrl: string;
    jobApplicationUrl: string;
  };
}) {
  if (!application.companyUrl && !application.jobApplicationUrl) {
    return null;
  }

  return (
    <dl className="mb-5 grid gap-4 text-sm md:grid-cols-2">
      {application.companyUrl ? (
        <SourceLink label="Company URL" url={application.companyUrl} />
      ) : null}
      {application.jobApplicationUrl ? (
        <SourceLink label="Job application URL" url={application.jobApplicationUrl} />
      ) : null}
    </dl>
  );
}

function SourceLink({ label, url }: { label: string; url: string }) {
  return (
    <div>
      <dt className="font-bold text-rv-text-soft">{label}</dt>
      <dd className="mt-1">
        <a
          className="break-all text-rv-primary-light underline-offset-4 hover:underline"
          href={url}
          rel="noreferrer"
          target="_blank"
        >
          {url}
        </a>
      </dd>
    </div>
  );
}
