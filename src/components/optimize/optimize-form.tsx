"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import {
  ApplicationDecisionFlag,
  applicationDecisionFromFit
} from "@/components/applications/application-decision-flag";
import { Alert, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { Metric } from "@/components/ui/metric";
import { Panel } from "@/components/ui/panel";
import { ScoreCard } from "@/components/ui/score-card";
import { HelperText } from "@/components/ui/typography";

type FitAssessment = {
  coreRequirementsMatched?: string[];
  coreRequirementsMissing?: string[];
  decision?: string;
  decisionTone?: string;
  fitScore?: number;
  gaps?: string[];
  improvementAreas?: string[];
  knowledgeToGain?: string[];
  matchedPreferredRequirements?: string[];
  recommendation?: string;
  riskFlags?: string[];
  strongMatches?: string[];
  summary?: string;
};

type ParsedJob = {
  company_name: string | null;
  keywords: string[];
  location: string | null;
  position_title: string | null;
  preferred_skills: string[];
  required_skills: string[];
  responsibilities: string[];
  salary: string | null;
  seniority: string | null;
};

type ApplicationContext = {
  companyContext: string;
  companyUrl: string;
  jobApplicationUrl: string;
  jobContext: string;
};

type AssessmentResponse = {
  assessment: {
    applicationContext: ApplicationContext;
    applicationId: string | null;
    atsBreakdown: {
      experienceAlignment: number;
      formattingCompatibility: number;
      keywordAlignment: number;
      overall: number;
      skillMatch: number;
    };
    baselineAtsScore: number;
    companyName: string | null;
    decision: string;
    fitAssessment: FitAssessment;
    fitScore: number;
    parsedJob: ParsedJob;
    positionTitle: string | null;
    salary: string;
    workflowStatus: "ready_for_generation" | "ready_with_caution";
  };
};

type OptimizeResponse = {
  application: {
    atsScore: number;
    baselineAtsScore: number;
    companyName: string | null;
    id: string;
    positionTitle: string | null;
    salary: string;
  };
};

const APPLICATION_DRAFT_STORAGE_KEY = "rolevector:new-application-draft";

async function parseResponse<TPayload extends object>(response: Response) {
  const text = await response.text();
  let payload: { error?: string } = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = (payload.error ?? text) || `Optimization failed (${response.status}).`;
    throw new Error(message);
  }

  return payload as TPayload;
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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

  return stringList([...new Set([...sources, title, description, ...bodySentences])]).slice(0, 8);
}

function optionalUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return "";
  }
}

function statusLabel(
  workflowStatus: AssessmentResponse["assessment"]["workflowStatus"],
  isLowFit: boolean
) {
  if (workflowStatus === "ready_for_generation") {
    return "Ready For Generation";
  }

  if (workflowStatus === "ready_with_caution") {
    return "Ready With Caution";
  }

  return isLowFit ? "Assessment Rejected" : "Needs Review";
}

function accordionSection({
  items,
  title
}: {
  items: string[];
  title: string;
}) {
  return (
    <details className="rounded-rvmd border border-rv-border bg-rv-bg/60 p-4" key={title}>
      <summary className="cursor-pointer list-none font-bold text-rv-text">
        {title}
      </summary>
      {items.length > 0 ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-rv-text-muted">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-rv-text-muted">No details captured.</p>
      )}
    </details>
  );
}

export function OptimizeForm() {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [assessment, setAssessment] = useState<AssessmentResponse["assessment"] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState("");
  const [jobApplicationUrl, setJobApplicationUrl] = useState("");
  const [isAssessing, setIsAssessing] = useState(false);
  const [isFetchingContext, setIsFetchingContext] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isContextReady, setIsContextReady] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [positionTitle, setPositionTitle] = useState("");
  const [salary, setSalary] = useState("");

  const decision = applicationDecisionFromFit({
    fitAssessment: assessment?.fitAssessment,
    fitScore: assessment?.fitScore ?? 0
  });
  const isLowFit = decision.decision === "Explore another opportunity";
  const showGenerationStep = Boolean(assessment);
  const showTailoringContextWidgets = showGenerationStep && isContextReady;
  const companyInsights = contextInsights(assessment?.applicationContext.companyContext ?? "");
  const jobInsights = contextInsights(assessment?.applicationContext.jobContext ?? "");

  useEffect(() => {
    const rawDraft = window.localStorage.getItem(APPLICATION_DRAFT_STORAGE_KEY);

    if (!rawDraft) {
      setIsDraftLoaded(true);
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as Partial<{
        company: string;
        companyUrl: string;
        jobApplicationUrl: string;
        jobDetails: string;
        positionTitle: string;
        salary: string;
      }>;

      setCompany(typeof draft.company === "string" ? draft.company : "");
      setCompanyUrl(typeof draft.companyUrl === "string" ? draft.companyUrl : "");
      setJobApplicationUrl(
        typeof draft.jobApplicationUrl === "string" ? draft.jobApplicationUrl : ""
      );
      setJobDetails(typeof draft.jobDetails === "string" ? draft.jobDetails : "");
      setPositionTitle(typeof draft.positionTitle === "string" ? draft.positionTitle : "");
      setSalary(typeof draft.salary === "string" ? draft.salary : "");
    } catch {
      window.localStorage.removeItem(APPLICATION_DRAFT_STORAGE_KEY);
    } finally {
      setIsDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isDraftLoaded) {
      return;
    }

    window.localStorage.setItem(
      APPLICATION_DRAFT_STORAGE_KEY,
      JSON.stringify({
        company,
        companyUrl,
        jobApplicationUrl,
        jobDetails,
        positionTitle,
        salary
      })
    );
  }, [
    company,
    companyUrl,
    isDraftLoaded,
    jobApplicationUrl,
    jobDetails,
    positionTitle,
    salary
  ]);

  function resetAssessmentState() {
    setError(null);
    setAssessment(null);
    setIsContextReady(false);
  }

  function requestPayload() {
    return {
      company: company.trim() || assessment?.companyName || "Unknown company",
      companyUrl: optionalUrl(companyUrl),
      jobApplicationUrl: optionalUrl(jobApplicationUrl),
      jobDetails,
      positionTitle:
        positionTitle.trim() ||
        assessment?.positionTitle ||
        assessment?.parsedJob.position_title ||
        "Untitled position",
      salary
    };
  }

  async function assessPosition(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setError(null);
    setIsAssessing(true);

    try {
      const payload = await parseResponse<AssessmentResponse>(
        await fetch("/api/applications/assess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload())
        })
      );

      setCompany((current) => current.trim() || payload.assessment.companyName || "");
      setPositionTitle((current) => current.trim() || payload.assessment.positionTitle || "");
      setSalary((current) => current.trim() || payload.assessment.salary || "");
      setAssessment(payload.assessment);
      setIsContextReady(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to assess this position."
      );
    } finally {
      setIsAssessing(false);
    }
  }

  async function getContext(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (!assessment) {
      setError("Assess the position before collecting context.");
      return;
    }

    setError(null);
    setIsFetchingContext(true);

    try {
      const payload = await parseResponse<{ applicationContext: ApplicationContext }>(
        await fetch("/api/applications/context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyUrl,
            jobApplicationUrl
          })
        })
      );

      setAssessment((current) =>
        current
          ? {
              ...current,
              applicationContext: payload.applicationContext
            }
          : current
      );
      setIsContextReady(true);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to gather application context."
      );
    } finally {
      setIsFetchingContext(false);
    }
  }

  async function runGeneration() {
    if (!assessment) {
      return;
    }

    setError(null);
    setIsOptimizing(true);

    try {
      const payload = await parseResponse<OptimizeResponse>(
        await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload())
        })
      );

      window.localStorage.removeItem(APPLICATION_DRAFT_STORAGE_KEY);
      router.push(`/applications/${payload.application.id}`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to optimize this application."
      );
    } finally {
      setIsOptimizing(false);
    }
  }

  async function generateApplication(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (!assessment) {
      setError("Assess the position before generating the application.");
      return;
    }

    await runGeneration();
  }

  const reportSections = assessment
    ? [
        {
          title: "Core Requirements Matched",
          items: stringList(assessment.fitAssessment.coreRequirementsMatched)
        },
        {
          title: "Core Requirements Missing",
          items: stringList(assessment.fitAssessment.coreRequirementsMissing)
        },
        {
          title: "Matched Preferred Requirements",
          items: stringList(assessment.fitAssessment.matchedPreferredRequirements)
        },
        {
          title: "Notable Gaps Found",
          items: stringList(assessment.fitAssessment.gaps)
        },
        {
          title: "Improvements To Make",
          items: stringList(assessment.fitAssessment.improvementAreas)
        },
        {
          title: "Knowledge To Gain",
          items: stringList(assessment.fitAssessment.knowledgeToGain)
        },
        {
          title: "Risk Flags",
          items: stringList(assessment.fitAssessment.riskFlags)
        }
      ]
    : [];

  return (
    <>
      <section className="grid gap-6">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-title text-xl uppercase text-rv-text">
                Step 1: Begin Assessment
              </h2>
              <p className="mt-2 text-sm leading-6 text-rv-text-muted">
                Add the job title and paste the job description. The assessment uses both signals
                first so you can decide whether generation is worth the token cost.
              </p>
            </div>
            <Tag>{assessment ? "Assessment Completed" : "Awaiting Assessment"}</Tag>
          </div>
          <Field
            className="mt-4"
            helper="Use the exact job title when available. This improves role-family and seniority detection."
            htmlFor="position-title-input"
            label="Job position title"
          >
            <TextInput
              id="position-title-input"
              onChange={(event) => {
                setPositionTitle(event.currentTarget.value);
                resetAssessmentState();
              }}
              placeholder="Senior Software Engineer"
              required
              value={positionTitle}
            />
          </Field>
          <Field
            className="mt-4"
            helper="Paste the full job responsibilities, requirements, benefits, and ATS-relevant details."
            htmlFor="job-details-input"
            label="Job details"
          >
            <TextArea
              className="min-h-96"
              id="job-details-input"
              onChange={(event) => {
                setJobDetails(event.currentTarget.value);
                resetAssessmentState();
              }}
              placeholder="Paste the job details here..."
              required
              value={jobDetails}
            />
          </Field>

          {error ? (
            <Alert className="mt-4" tone="error">
              {error}
            </Alert>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              disabled={isAssessing || isOptimizing}
              onClick={assessPosition}
              type="button"
              variant="secondary"
            >
              {isAssessing
                ? "Assessing..."
                : assessment
                  ? "Reassess Position"
                  : "Begin Assessment"}
            </Button>
          </div>
        </Panel>

        {assessment && showGenerationStep ? (
          <Panel className="block">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-title text-xl uppercase text-rv-text">
                  Step 2: Review And Generate
                </h2>
                <p className="mt-2 text-sm leading-6 text-rv-text-muted">
                  Confirm the extracted application details, then continue to generation if this
                  role is worth pursuing.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ApplicationDecisionFlag {...decision} />
                <Tag>{statusLabel(assessment.workflowStatus, isLowFit)}</Tag>
              </div>
            </div>

            <div className="mt-4 grid items-start gap-4 md:grid-cols-2">
              <Field label="Company">
                <TextInput
                  onChange={(event) => {
                    setCompany(event.currentTarget.value);
                    setIsContextReady(false);
                  }}
                  required
                  value={company}
                />
              </Field>
              <Field label="Position title">
                <TextInput
                  onChange={(event) => {
                    setPositionTitle(event.currentTarget.value);
                    setIsContextReady(false);
                  }}
                  required
                  value={positionTitle}
                />
              </Field>
            </div>
            <Field className="mt-4" label="Salary">
              <TextInput
                onChange={(event) => {
                  setSalary(event.currentTarget.value);
                  setIsContextReady(false);
                }}
                placeholder="Optional"
                value={salary}
              />
            </Field>
            <div className="mt-4 grid items-start gap-4 md:grid-cols-2">
              <Field
                helper="Optional company site used as best-effort context for tailoring."
                label="Company URL"
              >
                <TextInput
                  onChange={(event) => {
                    setCompanyUrl(event.currentTarget.value);
                    setIsContextReady(false);
                  }}
                  placeholder="https://company.com"
                  type="url"
                  value={companyUrl}
                />
              </Field>
              <Field
                helper="Optional public job post URL used as best-effort context."
                label="Job application URL"
              >
                <TextInput
                  onChange={(event) => {
                    setJobApplicationUrl(event.currentTarget.value);
                    setIsContextReady(false);
                  }}
                  placeholder="https://company.com/careers/role"
                  type="url"
                  value={jobApplicationUrl}
                />
              </Field>
            </div>

            <Alert className="mt-4" tone={isLowFit ? "warning" : "success"}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">
                  Fit score: {assessment.fitScore.toFixed(1)} / 10
                </span>
                <Tag>{assessment.fitAssessment.recommendation ?? "Assessment complete"}</Tag>
              </div>
              <p className="mt-3">
                {assessment.fitAssessment.summary ?? "Assessment complete."}
              </p>
            </Alert>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                disabled={isAssessing || isFetchingContext || isOptimizing}
                onClick={getContext}
                type="button"
                variant={isContextReady ? "ghost" : "secondary"}
              >
                {isFetchingContext
                  ? "Getting Context..."
                  : isContextReady
                    ? "Refresh Context"
                    : "Get Context"}
              </Button>
              <Button
                disabled={isAssessing || isFetchingContext || isOptimizing}
                onClick={generateApplication}
                type="button"
                variant="highlight"
              >
                {isOptimizing ? "Generating..." : "Continue To Generation"}
              </Button>
            </div>
          </Panel>
        ) : null}

        {assessment ? (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="grid gap-6">
              <div
                className={`grid gap-6 ${showTailoringContextWidgets ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}
              >
                {showTailoringContextWidgets ? (
                  <Panel>
                    <h2 className="font-title text-xl uppercase text-rv-text">
                      Tailoring Context
                    </h2>
                    <div className="mt-4 grid gap-4 text-sm">
                      <div>
                        <h3 className="font-bold text-rv-text-soft">Company context</h3>
                        {companyInsights.length > 0 ? (
                          <ul className="mt-2 list-disc space-y-2 pl-5 leading-6 text-rv-text-muted">
                            {companyInsights.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-rv-text-muted">
                            No useful company context captured.
                          </p>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-rv-text-soft">Job context</h3>
                        {jobInsights.length > 0 ? (
                          <ul className="mt-2 list-disc space-y-2 pl-5 leading-6 text-rv-text-muted">
                            {jobInsights.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-rv-text-muted">
                            No useful job-page context captured.
                          </p>
                        )}
                      </div>
                    </div>
                  </Panel>
                ) : null}

                <Panel>
                  <h2 className="font-title text-xl uppercase text-rv-text">Metadata Context</h2>
                  <div className="mt-4 grid gap-4 text-sm">
                    <div>
                      <h3 className="font-bold text-rv-text-soft">Parsed role metadata</h3>
                      <ul className="mt-2 space-y-2 leading-6 text-rv-text-muted">
                        <li>Role: {assessment.parsedJob.position_title ?? "-"}</li>
                        <li>Company: {assessment.parsedJob.company_name ?? "-"}</li>
                        <li>Seniority: {assessment.parsedJob.seniority ?? "-"}</li>
                        <li>Location: {assessment.parsedJob.location ?? "-"}</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-bold text-rv-text-soft">ATS metadata</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {assessment.parsedJob.keywords.map((keyword) => (
                          <Tag key={keyword}>{keyword}</Tag>
                        ))}
                      </div>
                    </div>
                  </div>
                </Panel>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Panel>
                  <h2 className="font-title text-xl uppercase text-rv-text">
                    Core Requirements Matched
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {stringList(assessment.fitAssessment.coreRequirementsMatched).map((item) => (
                      <Tag key={item}>{item}</Tag>
                    ))}
                  </div>
                </Panel>
                <Panel>
                  <h2 className="font-title text-xl uppercase text-rv-text">Notable Gaps Found</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {stringList(assessment.fitAssessment.gaps).map((item) => (
                      <Tag key={item}>{item}</Tag>
                    ))}
                  </div>
                </Panel>
                <Panel>
                  <h2 className="font-title text-xl uppercase text-rv-text">Risk Flags</h2>
                  {stringList(assessment.fitAssessment.riskFlags).length > 0 ? (
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-rv-text-muted">
                      {stringList(assessment.fitAssessment.riskFlags).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <HelperText className="mt-4">No major risk flags detected.</HelperText>
                  )}
                </Panel>
              </div>

              <Panel>
                <h2 className="font-title text-xl uppercase text-rv-text">
                  Job Required Skills
                </h2>
                {stringList(assessment.parsedJob.required_skills).length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {stringList(assessment.parsedJob.required_skills).map((item) => (
                      <Tag key={item}>{item}</Tag>
                    ))}
                  </div>
                ) : (
                  <HelperText className="mt-4">
                    No required skills were extracted from the job description.
                  </HelperText>
                )}
              </Panel>

              <Panel>
                <h2 className="font-title text-xl uppercase text-rv-text">Application Flow</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <Metric label="Assessment" value="1" />
                  <Metric label="Generation" value="2" />
                  <Metric label="Export Review" value="3" />
                </div>
                <HelperText className="mt-4">
                  This report is the pre-generation checkpoint. Review the extracted signals before
                  spending tokens on the tailored application draft.
                </HelperText>
              </Panel>

              <Panel>
                <h2 className="font-title text-xl uppercase text-rv-text">
                  Assessment Report Details
                </h2>
                <div className="mt-4 grid gap-4">
                  {reportSections.map((section) => accordionSection(section))}
                  {showTailoringContextWidgets
                    ? accordionSection({
                        title: "Tailoring Context Insights",
                        items: stringList([...companyInsights, ...jobInsights])
                      })
                    : null}
                  {accordionSection({
                    title: "Responsibilities Extracted",
                    items: stringList(assessment.parsedJob.responsibilities)
                  })}
                  {accordionSection({
                    title: "Preferred Requirements",
                    items: stringList(assessment.parsedJob.preferred_skills)
                  })}
                </div>
              </Panel>
            </div>

            <aside className="grid gap-6">
              <Panel>
                <h2 className="font-title text-xl uppercase text-rv-text">Workflow Status</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Tag>Assessment Completed</Tag>
                  <Tag>{statusLabel(assessment.workflowStatus, isLowFit)}</Tag>
                </div>
                <p className="mt-4 text-sm leading-6 text-rv-text-muted">
                  {assessment.workflowStatus === "ready_for_generation"
                    ? "The role is aligned strongly enough to proceed directly to generation."
                    : assessment.workflowStatus === "ready_with_caution"
                      ? "The role is viable, but the generated application should emphasize the strongest matching evidence carefully."
                      : "The assessment flagged concerns, but generation remains available while the assessor is under review."}
                </p>
              </Panel>

              <Panel>
                <h2 className="font-title text-xl uppercase text-rv-text">Apply Fit</h2>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="font-title text-4xl text-rv-highlight">
                    {assessment.fitScore.toFixed(1)}
                  </span>
                  <span className="text-sm font-bold text-rv-text-soft">
                    {assessment.fitAssessment.recommendation ?? "Not assessed"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-rv-text-muted">
                  {assessment.fitAssessment.summary}
                </p>
              </Panel>

              <ScoreCard
                headline="Baseline Before Generation"
                helperText="Compatibility score from the current Master CV before a generated application exists."
                label="ATS Compatibility"
                score={assessment.baselineAtsScore.toFixed(1)}
                summary={`Keyword alignment ${assessment.atsBreakdown.keywordAlignment.toFixed(1)}, skill match ${assessment.atsBreakdown.skillMatch.toFixed(1)}, experience alignment ${assessment.atsBreakdown.experienceAlignment.toFixed(1)}.`}
              />

              <Panel>
                <h2 className="font-title text-xl uppercase text-rv-text">Score Comparison</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Metric label="Fit Score" value={assessment.fitScore.toFixed(1)} />
                  <Metric label="Baseline ATS" value={assessment.baselineAtsScore.toFixed(1)} />
                </div>
              </Panel>
            </aside>
          </section>
        ) : null}
      </section>

    </>
  );
}
