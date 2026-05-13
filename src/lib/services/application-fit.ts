import type { ParsedJob } from "@/lib/schemas/job";
import type { MasterCv } from "@/lib/schemas/master-cv";
import type { ApplicationContext } from "./application-context";

export type ApplicationFitAssessment = {
  fitScore: number;
  recommendation: "Strong apply" | "Apply with positioning" | "Stretch" | "Low fit";
  summary: string;
  strongMatches: string[];
  gaps: string[];
  riskFlags: string[];
};

export function assessApplicationFit({
  applicationContext,
  masterCv,
  parsedJob
}: {
  applicationContext?: Partial<ApplicationContext>;
  masterCv: MasterCv;
  parsedJob: ParsedJob;
}): ApplicationFitAssessment {
  const cvTerms = cvTermSet(masterCv);
  const requiredTerms = unique([
    ...parsedJob.required_skills,
    ...parsedJob.keywords,
    ...splitTerms(parsedJob.position_title ?? "")
  ]).slice(0, 60);
  const matchedRequired = requiredTerms.filter((term) =>
    hasTermOverlap(term, cvTerms)
  );
  const missingRequired = requiredTerms.filter(
    (term) => !hasTermOverlap(term, cvTerms)
  );
  const responsibilityMatches = parsedJob.responsibilities.filter((item) =>
    splitTerms(item).some((term) => hasTermOverlap(term, cvTerms))
  );
  const riskFlags = detectRiskFlags(parsedJob, masterCv, applicationContext);
  const requiredRatio =
    requiredTerms.length === 0 ? 0.7 : matchedRequired.length / requiredTerms.length;
  const responsibilityRatio =
    parsedJob.responsibilities.length === 0
      ? 0.7
      : responsibilityMatches.length / parsedJob.responsibilities.length;
  const riskPenalty = Math.min(2, riskFlags.length * 0.6);
  const fitScore = clamp(
    requiredRatio * 6 + responsibilityRatio * 3 + 1 - riskPenalty,
    0,
    10
  );
  const recommendation = recommendationFor(fitScore);
  const strongMatches = unique([
    ...matchedRequired,
    ...responsibilityMatches.map((item) => concise(item))
  ]).slice(0, 6);
  const gaps = missingRequired
    .filter((term) => term.length > 2)
    .slice(0, 6);

  return {
    fitScore: Number(fitScore.toFixed(1)),
    recommendation,
    summary: summaryFor(recommendation, matchedRequired.length, gaps.length, riskFlags.length),
    strongMatches,
    gaps,
    riskFlags
  };
}

function cvTermSet(masterCv: MasterCv) {
  return new Set(
    [
      masterCv.basics.title,
      masterCv.summary,
      ...masterCv.frontend_expertise,
      ...masterCv.hard_skills,
      ...masterCv.soft_skills,
      ...masterCv.technical_skills.languages,
      ...masterCv.technical_skills.frameworks,
      ...masterCv.technical_skills.cms,
      ...masterCv.technical_skills.tools,
      ...masterCv.hidden_context.keywords,
      ...masterCv.hidden_context.additional_experience,
      ...masterCv.work_experience.flatMap((item) => [
        item.company,
        item.title,
        item.description,
        ...item.hard_skills,
        ...item.soft_skills,
        ...item.programming_languages,
        ...item.frameworks,
        ...item.cms,
        ...item.tools
      ]),
      ...masterCv.projects.flatMap((project) => [
        project.title,
        project.client,
        project.description
      ]),
      ...masterCv.certifications,
      ...masterCv.languages
    ]
      .flatMap(splitTerms)
      .map(normalize)
      .filter(Boolean)
  );
}

function detectRiskFlags(
  parsedJob: ParsedJob,
  masterCv: MasterCv,
  applicationContext?: Partial<ApplicationContext>
) {
  const jobText = normalize(
    [
      parsedJob.position_title ?? "",
      parsedJob.seniority ?? "",
      ...parsedJob.required_skills,
      ...parsedJob.preferred_skills,
      ...parsedJob.responsibilities,
      ...parsedJob.keywords,
      applicationContext?.companyContext ?? "",
      applicationContext?.jobContext ?? ""
    ].join(" ")
  );
  const cvText = normalize(
    [
      masterCv.basics.location,
      masterCv.summary,
      ...masterCv.certifications,
      ...masterCv.hidden_context.keywords,
      ...masterCv.hidden_context.additional_experience
    ].join(" ")
  );
  const risks = [];

  if (/\bclearance|public trust|secret clearance|top secret\b/.test(jobText) && !/\bclearance|public trust|secret clearance|top secret\b/.test(cvText)) {
    risks.push("Job mentions clearance or public trust requirements not found in the Master CV.");
  }

  if (/\bus citizen|u\.s\. citizen|permanent resident|green card\b/.test(jobText) && !/\bus citizen|u\.s\. citizen|permanent resident|green card\b/.test(cvText)) {
    risks.push("Job mentions citizenship or residency requirements not found in the Master CV.");
  }

  if (/\bon[-\s]?site|hybrid|relocation\b/.test(jobText) && /\bremote|ecuador|guayaquil\b/.test(cvText)) {
    risks.push("Job may have location expectations that should be checked before applying.");
  }

  return risks;
}

function recommendationFor(score: number): ApplicationFitAssessment["recommendation"] {
  if (score >= 8) {
    return "Strong apply";
  }

  if (score >= 6.5) {
    return "Apply with positioning";
  }

  if (score >= 4.5) {
    return "Stretch";
  }

  return "Low fit";
}

function summaryFor(
  recommendation: ApplicationFitAssessment["recommendation"],
  matchCount: number,
  gapCount: number,
  riskCount: number
) {
  return `${recommendation}: ${matchCount} relevant signals matched, ${gapCount} notable gaps found, and ${riskCount} risk flags detected.`;
}

function hasTermOverlap(term: string, cvTerms: Set<string>) {
  const normalized = normalize(term);

  if (!normalized || stopWords.has(normalized)) {
    return false;
  }

  return [...cvTerms].some(
    (cvTerm) => cvTerm === normalized || cvTerm.includes(normalized) || normalized.includes(cvTerm)
  );
}

function splitTerms(value: string) {
  return value
    .split(/,|\n|;|\||\/|•|-|\(|\)|\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2 && !stopWords.has(normalize(term)));
}

function concise(value: string) {
  return value.length > 120 ? `${value.slice(0, 117).trim()}...` : value;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

const stopWords = new Set([
  "and",
  "are",
  "for",
  "from",
  "have",
  "including",
  "job",
  "must",
  "preferred",
  "required",
  "requirements",
  "responsibilities",
  "role",
  "skills",
  "the",
  "this",
  "with",
  "work",
  "working",
  "years"
]);
