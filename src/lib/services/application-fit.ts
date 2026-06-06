import type { ParsedJob } from "@/lib/schemas/job";
import type { MasterCv } from "@/lib/schemas/master-cv";
import type { ApplicationContext } from "./application-context";

export type ApplicationFitAssessment = {
  coreRequirementsMatched: string[];
  coreRequirementsMissing: string[];
  decision: "Ready to submit" | "Worth optimizing" | "Explore another opportunity";
  decisionTone: "success" | "warning" | "danger";
  fitScore: number;
  improvementAreas: string[];
  knowledgeToGain: string[];
  matchedPreferredRequirements: string[];
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
  const cvText = cvTextBlock(masterCv);
  const titleSignals = specializedRoleTerms(parsedJob.position_title ?? "");
  const hardRequirements = unique(parsedJob.required_skills).slice(0, 18);
  const preferredRequirements = unique(parsedJob.preferred_skills).slice(0, 12);
  const keywordSignals = unique(
    [
      ...parsedJob.keywords,
      ...titleSignals
    ].filter((term) => !hardRequirements.some((required) => sameTerm(required, term)))
  ).slice(0, 20);

  const matchedHard = hardRequirements.filter((term) => hasTermOverlap(term, cvTerms));
  const missingHard = hardRequirements.filter((term) => !hasTermOverlap(term, cvTerms));
  const matchedTitleSignals = titleSignals.filter((term) => hasTermOverlap(term, cvTerms));
  const matchedPreferred = preferredRequirements.filter((term) =>
    hasTermOverlap(term, cvTerms)
  );
  const matchedKeywords = keywordSignals.filter((term) => hasTermOverlap(term, cvTerms));
  const responsibilityMatches = parsedJob.responsibilities.filter((item) =>
    responsibilitySupportsCv(item, cvTerms)
  );
  const riskFlags = detectRiskFlags(parsedJob, masterCv, applicationContext);
  const hardRatio =
    hardRequirements.length === 0 ? 0.45 : matchedHard.length / hardRequirements.length;
  const preferredRatio =
    preferredRequirements.length === 0
      ? 0.3
      : matchedPreferred.length / preferredRequirements.length;
  const keywordRatio =
    keywordSignals.length === 0 ? 0.35 : matchedKeywords.length / keywordSignals.length;
  const responsibilityRatio =
    parsedJob.responsibilities.length === 0
      ? 0.35
      : responsibilityMatches.length / parsedJob.responsibilities.length;

  const missingCorePenalty = missingCorePenaltyFor({
    hardRequirementCount: hardRequirements.length,
    matchedHardCount: matchedHard.length,
    missingHardCount: missingHard.length
  });
  const riskPenalty = Math.min(2.5, riskFlags.length * 0.8);
  const seniorityPenalty = seniorityMismatchPenalty(parsedJob, masterCv);
  const rolePenalty = roleMismatchPenalty(parsedJob, masterCv, cvText);
  const titleAlignmentBonus = Math.min(
    1.8,
    matchedTitleSignals.reduce((sum, term) => sum + titleSignalWeight(term), 0)
  );
  const specializedDomainBonus = specializedDomainBonusFor({
    hardRequirements,
    matchedHard,
    matchedKeywords,
    matchedTitleSignals
  });
  const fitScore = clamp(
    hardRatio * 5.2 +
      preferredRatio * 0.5 +
      keywordRatio * 0.5 +
      responsibilityRatio * 1.8 +
      titleAlignmentBonus -
      missingCorePenalty -
      riskPenalty -
      seniorityPenalty -
      rolePenalty,
    0,
    10
  );
  const adjustedFitScore = clamp(fitScore + specializedDomainBonus, 0, 10);
  const recommendation = recommendationFor(adjustedFitScore);
  const decision = decisionFor(adjustedFitScore, riskFlags.length, missingHard.length);
  const strongMatches = unique([
    ...matchedHard,
    ...matchedTitleSignals,
    ...matchedPreferred,
    ...matchedKeywords.slice(0, 2),
    ...responsibilityMatches.map((item) => concise(item))
  ]).slice(0, 6);
  const gaps = unique([...missingHard, ...unmatchedTitleSignals(parsedJob, cvTerms)]).slice(0, 6);

  return {
    coreRequirementsMatched: matchedHard.slice(0, 8),
    coreRequirementsMissing: missingHard.slice(0, 8),
    decision: decision.decision,
    decisionTone: decision.decisionTone,
    fitScore: Number(adjustedFitScore.toFixed(1)),
    improvementAreas: unique([
      ...missingHard.map((term) => `Build credible evidence around ${term}.`),
      ...unmatchedTitleSignals(parsedJob, cvTerms).map(
        (term) => `Strengthen positioning for ${term}-oriented work.`
      ),
      ...(riskFlags.length > 0 ? ["Resolve the listed application risks before generating."] : [])
    ]).slice(0, 6),
    knowledgeToGain: unique([
      ...missingHard,
      ...preferredRequirements.filter(
        (term) => !matchedPreferred.some((matched) => sameTerm(matched, term))
      )
    ]).slice(0, 6),
    matchedPreferredRequirements: matchedPreferred.slice(0, 6),
    recommendation,
    summary: summaryFor(
      decision.decision,
      recommendation,
      matchedHard.length,
      hardRequirements.length,
      gaps.length,
      riskFlags.length
    ),
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

function cvTextBlock(masterCv: MasterCv) {
  return normalize(
    [
      masterCv.basics.title,
      masterCv.summary,
      ...masterCv.work_experience.flatMap((item) => [item.title, item.description]),
      ...masterCv.projects.flatMap((project) => [project.title, project.description]),
      ...masterCv.hidden_context.keywords
    ].join(" ")
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
      masterCv.basics.title,
      ...masterCv.certifications,
      ...masterCv.hidden_context.keywords,
      ...masterCv.hidden_context.additional_experience
    ].join(" ")
  );
  const risks = [];

  if (
    /\bclearance|public trust|secret clearance|top secret\b/.test(jobText) &&
    !/\bclearance|public trust|secret clearance|top secret\b/.test(cvText)
  ) {
    risks.push("Job mentions clearance or public trust requirements not found in the Master CV.");
  }

  if (
    /\bus citizen|u\.s\. citizen|permanent resident|green card\b/.test(jobText) &&
    !/\bus citizen|u\.s\. citizen|permanent resident|green card\b/.test(cvText)
  ) {
    risks.push("Job mentions citizenship or residency requirements not found in the Master CV.");
  }

  if (/\bon[-\s]?site|hybrid|relocation\b/.test(jobText) && /\bremote|ecuador|guayaquil\b/.test(cvText)) {
    risks.push("Job may have location expectations that should be checked before applying.");
  }

  return risks;
}

function recommendationFor(score: number): ApplicationFitAssessment["recommendation"] {
  if (score >= 7) {
    return "Strong apply";
  }

  if (score >= 5) {
    return "Apply with positioning";
  }

  if (score >= 3.5) {
    return "Stretch";
  }

  return "Low fit";
}

function decisionFor(
  score: number,
  riskCount: number,
  missingCoreCount: number
): Pick<ApplicationFitAssessment, "decision" | "decisionTone"> {
  if (score >= 7 && riskCount === 0 && missingCoreCount <= 2) {
    return {
      decision: "Ready to submit",
      decisionTone: "success"
    };
  }

  if (score >= 5 && riskCount <= 1 && missingCoreCount <= 4) {
    return {
      decision: "Worth optimizing",
      decisionTone: "warning"
    };
  }

  return {
    decision: "Explore another opportunity",
    decisionTone: "danger"
  };
}

function summaryFor(
  decision: ApplicationFitAssessment["decision"],
  recommendation: ApplicationFitAssessment["recommendation"],
  matchedCore: number,
  totalCore: number,
  gapCount: number,
  riskCount: number
) {
  return `${decision}: ${recommendation.toLowerCase()} with ${matchedCore}/${totalCore || 0} core requirements matched, ${gapCount} notable gaps found, and ${riskCount} risk flags detected.`;
}

function hasTermOverlap(term: string, cvTerms: Set<string>) {
  const normalized = normalize(term);

  if (!normalized || stopWords.has(normalized)) {
    return false;
  }

  if (cvTerms.has(normalized)) {
    return true;
  }

  if (normalized.includes(" ")) {
    return cvTerms.has(normalized);
  }

  if (normalized.length <= 3) {
    return false;
  }

  return [...cvTerms].some((cvTerm) => {
    if (cvTerm === normalized) {
      return true;
    }

    if (cvTerm.includes(" ")) {
      return cvTerm.split(" ").includes(normalized);
    }

    return false;
  });
}

function responsibilitySupportsCv(item: string, cvTerms: Set<string>) {
  const terms = splitTerms(item);
  const matchedTerms = terms.filter((term) => hasTermOverlap(term, cvTerms));

  if (terms.length <= 3) {
    return matchedTerms.length >= 1;
  }

  return matchedTerms.length >= 2;
}

function specializedRoleTerms(value: string) {
  return splitTerms(value).filter((term) => roleSignalTerms.has(normalize(term)));
}

function unmatchedTitleSignals(parsedJob: ParsedJob, cvTerms: Set<string>) {
  return specializedRoleTerms(parsedJob.position_title ?? "").filter(
    (term) => !hasTermOverlap(term, cvTerms)
  );
}

function missingCorePenaltyFor({
  hardRequirementCount,
  matchedHardCount,
  missingHardCount
}: {
  hardRequirementCount: number;
  matchedHardCount: number;
  missingHardCount: number;
}) {
  if (missingHardCount === 0) {
    return 0;
  }

  if (hardRequirementCount <= 2 && matchedHardCount >= 1) {
    return missingHardCount * 0.5;
  }

  if (hardRequirementCount <= 4 && matchedHardCount >= Math.ceil(hardRequirementCount / 2)) {
    return missingHardCount * 0.9;
  }

  return Math.min(4.5, missingHardCount * 1.3);
}

function seniorityMismatchPenalty(parsedJob: ParsedJob, masterCv: MasterCv) {
  const requested = normalize(parsedJob.seniority ?? "");

  if (!requested) {
    return 0;
  }

  const cvText = normalize(
    [
      masterCv.basics.title,
      masterCv.summary,
      ...masterCv.work_experience.map((item) => item.title)
    ].join(" ")
  );

  if (/staff|principal/.test(requested) && !/\bstaff\b|\bprincipal\b|\blead\b/.test(cvText)) {
    return 1.6;
  }

  if (/lead/.test(requested) && !/\blead\b|\bstaff\b|\bprincipal\b/.test(cvText)) {
    return 1.1;
  }

  if (/senior/.test(requested) && !/\bsenior\b|\blead\b|\bstaff\b|\bprincipal\b/.test(cvText)) {
    return 0.8;
  }

  return 0;
}

function roleMismatchPenalty(parsedJob: ParsedJob, masterCv: MasterCv, cvText: string) {
  const roleText = normalize(parsedJob.position_title ?? "");
  const cvRoleText = normalize(
    [masterCv.basics.title, ...masterCv.work_experience.map((item) => item.title)].join(" ")
  );

  if (!roleText) {
    return 0;
  }

  if (/\bbackend\b|node|api/.test(roleText) && !/\bbackend\b|node|api|server/.test(cvText)) {
    return 1.2;
  }

  if (/\bfrontend\b|react|ui/.test(roleText) && !/\bfrontend\b|react|ui|web/.test(cvRoleText)) {
    return 0.9;
  }

  if (/\bdrupal\b|cms/.test(roleText) && !/\bdrupal\b|cms|content/.test(cvText)) {
    return 1.0;
  }

  return 0;
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

function titleSignalWeight(term: string) {
  const normalized = normalize(term);

  if (specializedTitleSignals.has(normalized)) {
    return 1.2;
  }

  if (genericTitleSignals.has(normalized)) {
    return 0.35;
  }

  return 0.5;
}

function specializedDomainBonusFor({
  hardRequirements,
  matchedHard,
  matchedKeywords,
  matchedTitleSignals
}: {
  hardRequirements: string[];
  matchedHard: string[];
  matchedKeywords: string[];
  matchedTitleSignals: string[];
}) {
  const required = new Set(hardRequirements.map(normalize));
  const matched = new Set(
    [...matchedHard, ...matchedKeywords, ...matchedTitleSignals].map(normalize)
  );

  if (matched.has("drupal") && (required.has("shopify") || matched.has("cms"))) {
    return 1.1;
  }

  return 0;
}

function sameTerm(a: string, b: string) {
  return normalize(a) === normalize(b);
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

const roleSignalTerms = new Set([
  "frontend",
  "backend",
  "fullstack",
  "react",
  "node",
  "drupal",
  "cms",
  "web",
  "ui",
  "api"
]);

const specializedTitleSignals = new Set(["drupal", "cms", "node", "api"]);
const genericTitleSignals = new Set(["frontend", "backend", "fullstack", "web", "ui", "react"]);
