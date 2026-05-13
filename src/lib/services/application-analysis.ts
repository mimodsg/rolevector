import type { AtsScoreBreakdown } from "@/lib/services/ats-scoring";
import type { ApplicationFitAssessment } from "@/lib/services/application-fit";
import type { ParsedJob } from "@/lib/schemas/job";
import type { MasterCv } from "@/lib/schemas/master-cv";

export type KeywordInsight = {
  label: string;
  status: "matched" | "recommended";
};

export type SectionAnalysis = {
  label: string;
  score: number;
  status: string;
};

export type ApplicationAnalysisSnapshot = {
  summary: string;
  recommendation: string;
  strengths: string[];
  improvementAreas: string[];
  topStrengths: string[];
  recommendedKeywords: KeywordInsight[];
  sections: SectionAnalysis[];
  scores: {
    overall: number;
    beforeAts: number;
    afterAts: number | null;
    keywordMatch: number;
    atsCompatibility: number;
    humanScreener: number;
    skills: number;
    experience: number;
    education: number;
    keywords: number;
    formatting: number;
  };
};

const emptySnapshot: ApplicationAnalysisSnapshot = {
  summary: "Analysis will appear after the application is generated.",
  recommendation: "Create or optimize this application to view tailored recommendations.",
  strengths: [],
  improvementAreas: [],
  topStrengths: [],
  recommendedKeywords: [],
  sections: [],
  scores: {
    afterAts: null,
    atsCompatibility: 0,
    beforeAts: 0,
    education: 0,
    experience: 0,
    formatting: 0,
    humanScreener: 0,
    keywordMatch: 0,
    keywords: 0,
    overall: 0,
    skills: 0
  }
};

export function applicationAnalysisSnapshot(value: unknown) {
  if (!value || typeof value !== "object") {
    return emptySnapshot;
  }

  return {
    ...emptySnapshot,
    ...(value as Partial<ApplicationAnalysisSnapshot>),
    scores: {
      ...emptySnapshot.scores,
      ...((value as Partial<ApplicationAnalysisSnapshot>).scores ?? {})
    }
  };
}

export function buildApplicationAnalysisSnapshot({
  atsBreakdown,
  baselineAtsScore,
  currentAtsScore,
  fitAssessment,
  isOptimized,
  masterCv,
  parsedJob
}: {
  atsBreakdown: AtsScoreBreakdown;
  baselineAtsScore: number;
  currentAtsScore: number;
  fitAssessment: ApplicationFitAssessment;
  isOptimized: boolean;
  masterCv: MasterCv;
  parsedJob: ParsedJob;
}): ApplicationAnalysisSnapshot {
  const keywordInsights = keywordInsightsFor(masterCv, parsedJob);
  const matchedKeywordCount = keywordInsights.filter(
    (keyword) => keyword.status === "matched"
  ).length;
  const totalKeywordCount = keywordInsights.length;
  const keywordMatch =
    totalKeywordCount === 0
      ? scoreToPercent(atsBreakdown.keywordAlignment)
      : Math.round((matchedKeywordCount / totalKeywordCount) * 100);
  const humanScreener = humanScreenerScore({ fitAssessment, masterCv, parsedJob });
  const overall = Math.round(
    baselineAtsScore * 3 +
      (isOptimized ? currentAtsScore : baselineAtsScore) * 3 +
      fitAssessment.fitScore * 2 +
      humanScreener * 0.2
  );
  const sections = sectionAnalysis({ isOptimized, masterCv, parsedJob });
  const improvementAreas = unique([
    ...fitAssessment.gaps,
    ...fitAssessment.riskFlags,
    ...keywordInsights
      .filter((keyword) => keyword.status === "recommended")
      .map((keyword) => `Add or strengthen ${keyword.label} where it is truthful.`)
  ]).slice(0, 5);
  const strengths = unique([
    ...fitAssessment.strongMatches,
    ...keywordInsights
      .filter((keyword) => keyword.status === "matched")
      .map((keyword) => `${keyword.label} is already represented.`)
  ]).slice(0, 5);

  return {
    summary: summaryFor({
      fitAssessment,
      isOptimized,
      keywordMatch,
      overall
    }),
    recommendation: recommendationFor({
      fitAssessment,
      improvementAreas,
      isOptimized,
      keywordMatch
    }),
    strengths,
    improvementAreas,
    topStrengths: strengths.slice(0, 4),
    recommendedKeywords: keywordInsights.slice(0, 18),
    sections,
    scores: {
      overall: clampPercent(overall),
      beforeAts: scoreToPercent(baselineAtsScore),
      afterAts: isOptimized ? scoreToPercent(currentAtsScore) : null,
      keywordMatch: clampPercent(keywordMatch),
      atsCompatibility: scoreToPercent(atsBreakdown.formattingCompatibility),
      humanScreener,
      skills: scoreToPercent(atsBreakdown.skillMatch),
      experience: scoreToPercent(atsBreakdown.experienceAlignment),
      education: sectionScore(masterCv.education.length > 0, isOptimized),
      keywords: clampPercent(keywordMatch),
      formatting: scoreToPercent(atsBreakdown.formattingCompatibility)
    }
  };
}

function keywordInsightsFor(masterCv: MasterCv, parsedJob: ParsedJob) {
  const cvTerms = new Set(
    [
      masterCv.summary,
      ...masterCv.frontend_expertise,
      ...masterCv.hard_skills,
      ...masterCv.soft_skills,
      ...masterCv.technical_skills.languages,
      ...masterCv.technical_skills.frameworks,
      ...masterCv.technical_skills.cms,
      ...masterCv.technical_skills.tools,
      ...masterCv.hidden_context.keywords,
      ...masterCv.work_experience.flatMap((experience) => [
        experience.title,
        experience.description,
        ...experience.hard_skills,
        ...experience.soft_skills,
        ...experience.programming_languages,
        ...experience.frameworks,
        ...experience.cms,
        ...experience.tools
      ]),
      ...masterCv.projects.flatMap((project) => [
        project.title,
        project.client,
        project.description
      ])
    ]
      .flatMap(splitTerms)
      .map(normalize)
      .filter(Boolean)
  );
  const jobTerms = unique([
    ...parsedJob.required_skills,
    ...parsedJob.preferred_skills,
    ...parsedJob.keywords,
    ...parsedJob.responsibilities.flatMap(splitTerms)
  ])
    .filter((term) => normalize(term).length > 2)
    .slice(0, 40);

  return jobTerms.map((term) => ({
    label: term,
    status: hasTerm(term, cvTerms) ? "matched" as const : "recommended" as const
  }));
}

function sectionAnalysis({
  isOptimized,
  masterCv,
  parsedJob
}: {
  isOptimized: boolean;
  masterCv: MasterCv;
  parsedJob: ParsedJob;
}): SectionAnalysis[] {
  return [
    {
      label: "Contact Info",
      score: sectionScore(Boolean(masterCv.basics.email && masterCv.basics.phone), isOptimized),
      status: masterCv.basics.email ? "Complete" : "Needs email"
    },
    {
      label: "Summary",
      score: sectionScore(masterCv.summary.length > 120, isOptimized),
      status: masterCv.summary.length > 120 ? "Strong" : "Needs detail"
    },
    {
      label: "Experience",
      score: sectionScore(masterCv.work_experience.length >= 3, isOptimized),
      status: masterCv.work_experience.length >= 3 ? "Relevant" : "Review depth"
    },
    {
      label: "Skills",
      score: sectionScore(totalSkills(masterCv) >= 12, isOptimized),
      status: totalSkills(masterCv) >= 12 ? "Covered" : "Needs keywords"
    },
    {
      label: "Education",
      score: sectionScore(masterCv.education.length > 0, isOptimized),
      status: masterCv.education.length > 0 ? "Present" : "Optional gap"
    },
    {
      label: "Projects",
      score: sectionScore(masterCv.projects.length > 0 || parsedJob.responsibilities.length < 1, isOptimized),
      status: masterCv.projects.length > 0 ? "Present" : "Could help"
    }
  ];
}

function humanScreenerScore({
  fitAssessment,
  masterCv,
  parsedJob
}: {
  fitAssessment: ApplicationFitAssessment;
  masterCv: MasterCv;
  parsedJob: ParsedJob;
}) {
  const summaryQuality = masterCv.summary.length > 160 ? 12 : 7;
  const experienceQuality = Math.min(25, masterCv.work_experience.length * 5);
  const projectQuality = Math.min(15, masterCv.projects.length * 5);
  const fitQuality = fitAssessment.fitScore * 4;
  const roleTitleQuality = hasTerm(parsedJob.position_title ?? "", new Set(splitTerms(masterCv.basics.title).map(normalize))) ? 8 : 4;
  const riskPenalty = Math.min(12, fitAssessment.riskFlags.length * 4);

  return clampPercent(
    Math.round(summaryQuality + experienceQuality + projectQuality + fitQuality + roleTitleQuality - riskPenalty)
  );
}

function sectionScore(isStrong: boolean, isOptimized: boolean) {
  const base = isStrong ? 82 : 62;

  return clampPercent(base + (isOptimized ? 8 : 0));
}

function scoreToPercent(score: number) {
  return clampPercent(Math.round(score * 10));
}

function summaryFor({
  fitAssessment,
  isOptimized,
  keywordMatch,
  overall
}: {
  fitAssessment: ApplicationFitAssessment;
  isOptimized: boolean;
  keywordMatch: number;
  overall: number;
}) {
  const state = isOptimized ? "optimized application" : "baseline application";

  return `This ${state} is scoring ${overall}% across ATS alignment, fit, and recruiter readability. Keyword coverage is ${keywordMatch}%, with a ${fitAssessment.recommendation.toLowerCase()} recommendation.`;
}

function recommendationFor({
  fitAssessment,
  improvementAreas,
  isOptimized,
  keywordMatch
}: {
  fitAssessment: ApplicationFitAssessment;
  improvementAreas: string[];
  isOptimized: boolean;
  keywordMatch: number;
}) {
  if (!isOptimized) {
    return "Run optimization to tailor the CV and cover letter before applying.";
  }

  if (fitAssessment.fitScore >= 8 && keywordMatch >= 75) {
    return "This application is ready for review and export.";
  }

  if (improvementAreas.length > 0) {
    return "Review the improvement areas before sending this application.";
  }

  return "The application is in good shape, with no major issues detected.";
}

function totalSkills(masterCv: MasterCv) {
  return (
    masterCv.hard_skills.length +
    masterCv.soft_skills.length +
    masterCv.technical_skills.languages.length +
    masterCv.technical_skills.frameworks.length +
    masterCv.technical_skills.cms.length +
    masterCv.technical_skills.tools.length
  );
}

function hasTerm(term: string, terms: Set<string>) {
  const normalized = normalize(term);

  if (!normalized) {
    return false;
  }

  return [...terms].some(
    (item) => item === normalized || item.includes(normalized) || normalized.includes(item)
  );
}

function splitTerms(value: string) {
  return value
    .split(/,|\n|;|\||\/|•|\(|\)|\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
