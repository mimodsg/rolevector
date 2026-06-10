import type { ParsedJob } from "@/lib/schemas/job";
import type { MasterCv } from "@/lib/schemas/master-cv";
import type { ApplicationContext } from "./application-context";

export type RequirementCategory =
  | "core requirement"
  | "supporting requirement"
  | "preferred requirement"
  | "responsibility"
  | "tool or platform"
  | "methodology/process"
  | "certification or credential"
  | "domain or industry knowledge"
  | "behavioral competency"
  | "location, legal, or availability constraint"
  | "generic low-signal phrase";

export type MatchStatus =
  | "supported"
  | "likelySupported"
  | "weaklySupported"
  | "unknown"
  | "unsupported";

export type ParsedJobProfile = {
  alternativeRequirementGroups: Array<{
    items: string[];
    mode: "any_of";
    sourceSection: string;
  }>;
  company: string | null;
  constraintClauses: string[];
  keywords: string[];
  location: string | null;
  positionTitle: string | null;
  preferredSkills: string[];
  requiredSkills: string[];
  responsibilities: string[];
  salary: string | null;
  seniority: string | null;
};

export type ClassifiedRequirement = {
  id: string;
  originalText: string;
  normalizedText: string;
  category: RequirementCategory;
  confidenceScore: number;
  importanceScore: number;
  sourceSection: string;
  isGeneric: boolean;
  isBlockingRequirement: boolean;
  groupId?: string;
};

export type ExtractionQuality = {
  requirementExtractionConfidence: number;
  requiredSkillQualityScore: number;
  genericRequirementRatio: number;
  vagueRequirementRatio: number;
  blockerRequirementCount: number;
};

export type CvEvidence = {
  id: string;
  sourceSection: string;
  sourceTitle: string;
  originalText: string;
  normalizedCapability: string;
  evidenceStrength: number;
  explicitOrInferred: "explicit" | "inferred";
  recency: number | null;
  frequency: number;
};

export type RequirementMatch = {
  requirementId: string;
  status: MatchStatus;
  matchScore: number;
  confidenceScore: number;
  evidenceReferences: string[];
  reason: string;
};

export type ScoreBreakdown = {
  overallFitScore: number;
  coreRequirementFit: number;
  responsibilityFit: number;
  preferredRequirementFit: number;
  evidenceStrength: number;
  seniorityAlignment: number;
  constraintRisk: number;
  assessmentConfidence: number;
};

export type GenerationDecision = "ALLOW" | "ALLOW_WITH_WARNING" | "BLOCK";

export type ApplicationFitAssessment = {
  parsedJobProfile: ParsedJobProfile;
  classifiedRequirements: ClassifiedRequirement[];
  extractedCvEvidence: CvEvidence[];
  requirementMatches: RequirementMatch[];
  extractionQuality: ExtractionQuality;
  scoreBreakdown: ScoreBreakdown;
  generationDecision: GenerationDecision;
  titleDescriptionConsistencyWarning: string | null;
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
  explanation: string;
};

type EvidenceMatch = {
  confidenceScore: number;
  evidence: CvEvidence;
  matchScore: number;
  reason: string;
};

type RequirementSourceSection =
  | "required_skills"
  | "preferred_skills"
  | "responsibilities"
  | "keywords"
  | "location"
  | "constraint";

export function assessApplicationFit({
  applicationContext,
  masterCv,
  parsedJob
}: {
  applicationContext?: Partial<ApplicationContext>;
  masterCv: MasterCv;
  parsedJob: ParsedJob;
}): ApplicationFitAssessment {
  const parsedJobProfile = buildParsedJobProfile(parsedJob);
  const classifiedRequirements = classifyRequirements(parsedJobProfile);
  const extractionQuality = assessExtractionQuality(classifiedRequirements);
  const extractedCvEvidence = extractCvEvidence(masterCv);
  const requirementMatches = matchRequirementsToEvidence(
    classifiedRequirements,
    extractedCvEvidence
  );
  const titleDescriptionConsistencyWarning = titleDescriptionConsistencyWarningFor(
    parsedJobProfile
  );
  const seniorityAlignment = seniorityAlignmentFor(parsedJobProfile, extractedCvEvidence);
  const constraintRisk = constraintRiskFor(
    classifiedRequirements,
    requirementMatches,
    applicationContext,
    masterCv,
    parsedJobProfile
  );
  const scoreBreakdown = buildScoreBreakdown({
    constraintRisk,
    extractedCvEvidence,
    extractionQuality,
    requirementMatches,
    requirements: classifiedRequirements,
    seniorityAlignment,
    titleDescriptionConsistencyWarning
  });
  const generationDecision = generationDecisionFor({
    extractionQuality,
    matches: requirementMatches,
    requirements: classifiedRequirements,
    scoreBreakdown
  });
  const riskFlags = riskFlagsFor({
    applicationContext,
    extractionQuality,
    generationDecision,
    masterCv,
    matches: requirementMatches,
    parsedJobProfile,
    requirements: classifiedRequirements,
    titleDescriptionConsistencyWarning
  });

  return buildCompatibilityAssessment({
    classifiedRequirements,
    extractedCvEvidence,
    extractionQuality,
    generationDecision,
    parsedJobProfile,
    requirementMatches,
    riskFlags,
    scoreBreakdown,
    titleDescriptionConsistencyWarning
  });
}

function buildParsedJobProfile(parsedJob: ParsedJob): ParsedJobProfile {
  return {
    alternativeRequirementGroups: (parsedJob.alternative_requirement_groups ?? []).map((group) => ({
      items: unique(group.items),
      mode: group.mode,
      sourceSection: group.source_section
    })),
    company: parsedJob.company_name,
    constraintClauses: unique(parsedJob.constraint_clauses ?? []),
    keywords: unique(parsedJob.keywords ?? []),
    location: parsedJob.location,
    positionTitle: parsedJob.position_title,
    preferredSkills: unique(parsedJob.preferred_skills ?? []),
    requiredSkills: unique(parsedJob.required_skills ?? []),
    responsibilities: unique(parsedJob.responsibilities ?? []),
    salary: parsedJob.salary,
    seniority: parsedJob.seniority
  };
}

function classifyRequirements(job: ParsedJobProfile) {
  const requirements: ClassifiedRequirement[] = [];

  for (const item of job.requiredSkills) {
    requirements.push(
      createRequirement({
        originalText: item,
        sourceSection: "required_skills",
        groupId: groupIdForRequirement(item, job.alternativeRequirementGroups)
      })
    );
  }

  for (const item of job.preferredSkills) {
    requirements.push(
      createRequirement({
        originalText: item,
        sourceSection: "preferred_skills"
      })
    );
  }

  for (const item of job.responsibilities) {
    requirements.push(
      createRequirement({
        originalText: item,
        sourceSection: "responsibilities"
      })
    );
  }

  for (const item of job.keywords) {
    if (requirements.some((existing) => existing.normalizedText === normalize(item))) {
      continue;
    }

    requirements.push(
      createRequirement({
        originalText: item,
        sourceSection: "keywords"
      })
    );
  }

  if (job.location && blockingLocationConstraintPattern.test(normalize(job.location))) {
    requirements.push(
      createRequirement({
        originalText: job.location,
        sourceSection: "location"
      })
    );
  }

  for (const item of job.constraintClauses) {
    requirements.push(
      createRequirement({
        originalText: item,
        sourceSection: "constraint"
      })
    );
  }

  return requirements;
}

function createRequirement({
  groupId,
  originalText,
  sourceSection
}: {
  groupId?: string;
  originalText: string;
  sourceSection: RequirementSourceSection;
}): ClassifiedRequirement {
  const normalizedText = normalize(originalText);
  const isGeneric = isGenericLowSignalPhrase(normalizedText);
  const category = requirementCategoryFor({
    isGeneric,
    normalizedText,
    sourceSection
  });
  const confidenceScore = requirementConfidenceFor({
    category,
    normalizedText,
    sourceSection
  });
  const importanceScore = requirementImportanceFor({
    category,
    isGeneric,
    normalizedText,
    sourceSection
  });
  const isBlockingRequirement = isBlockingRequirementFor({
    category,
    confidenceScore,
    importanceScore,
    normalizedText
  });

  return {
    confidenceScore,
    category,
    id: `${sourceSection}:${normalizedText}`,
    importanceScore,
    isBlockingRequirement,
    isGeneric,
    groupId,
    normalizedText,
    originalText,
    sourceSection
  };
}

function groupIdForRequirement(
  originalText: string,
  groups: ParsedJobProfile["alternativeRequirementGroups"]
) {
  const normalized = normalize(originalText);

  for (const group of groups) {
    if (
      group.items.some((item) => {
        const groupItem = normalize(item);
        return (
          groupItem === normalized ||
          capabilitySimilarity(groupItem, normalized) >= 0.72
        );
      })
    ) {
      return `${group.sourceSection}:${group.mode}:${group.items
        .map((item) => normalize(item))
        .sort()
        .join("|")}`;
    }
  }

  return undefined;
}

function assessExtractionQuality(requirements: ClassifiedRequirement[]): ExtractionQuality {
  const meaningful = requirements.filter(
    (requirement) => requirement.category !== "generic low-signal phrase"
  );
  const requiredLike = requirements.filter((requirement) =>
    requirement.sourceSection === "required_skills"
  );
  const genericCount = requirements.filter((requirement) => requirement.isGeneric).length;
  const vagueCount = requirements.filter((requirement) =>
    vagueRequirementPattern.test(requirement.normalizedText)
  ).length;
  const blockerRequirementCount = requirements.filter(
    (requirement) => requirement.isBlockingRequirement
  ).length;
  const requirementExtractionConfidence =
    meaningful.length === 0
      ? 0.35
      : average(meaningful.map((requirement) => requirement.confidenceScore));
  const requiredSkillQualityScore =
    requiredLike.length === 0
      ? 0.4
      : average(
          requiredLike.map((requirement) =>
            requirement.isGeneric
              ? requirement.confidenceScore * 0.35
              : requirement.confidenceScore * requirement.importanceScore
          )
        );

  return {
    blockerRequirementCount,
    genericRequirementRatio: requirements.length === 0 ? 0 : genericCount / requirements.length,
    requirementExtractionConfidence: Number(
      clamp(requirementExtractionConfidence, 0.1, 1).toFixed(2)
    ),
    requiredSkillQualityScore: Number(clamp(requiredSkillQualityScore, 0.1, 1).toFixed(2)),
    vagueRequirementRatio: requirements.length === 0 ? 0 : vagueCount / requirements.length
  };
}

function extractCvEvidence(masterCv: MasterCv) {
  const items: Array<Omit<CvEvidence, "frequency">> = [];

  pushEvidence(items, {
    originalText: masterCv.basics.title,
    sourceSection: "basics",
    sourceTitle: "Current Title"
  });
  pushEvidence(items, {
    explicitOrInferred: "inferred",
    originalText: masterCv.summary,
    sourceSection: "summary",
    sourceTitle: "Professional Summary",
    evidenceStrength: 0.72
  });

  for (const skill of masterCv.frontend_expertise) {
    pushEvidence(items, {
      originalText: skill,
      sourceSection: "frontend_expertise",
      sourceTitle: "Frontend Expertise"
    });
  }

  for (const skill of masterCv.hard_skills) {
    pushEvidence(items, {
      originalText: skill,
      sourceSection: "hard_skills",
      sourceTitle: "Hard Skills"
    });
  }

  for (const skill of masterCv.soft_skills) {
    pushEvidence(items, {
      originalText: skill,
      sourceSection: "soft_skills",
      sourceTitle: "Soft Skills"
    });
  }

  for (const skill of masterCv.technical_skills.languages) {
    pushEvidence(items, {
      originalText: skill,
      sourceSection: "technical_skills.languages",
      sourceTitle: "Technical Skills: Languages"
    });
  }

  for (const skill of masterCv.technical_skills.frameworks) {
    pushEvidence(items, {
      originalText: skill,
      sourceSection: "technical_skills.frameworks",
      sourceTitle: "Technical Skills: Frameworks"
    });
  }

  for (const skill of masterCv.technical_skills.cms) {
    pushEvidence(items, {
      originalText: skill,
      sourceSection: "technical_skills.cms",
      sourceTitle: "Technical Skills: CMS"
    });
  }

  for (const skill of masterCv.technical_skills.tools) {
    pushEvidence(items, {
      originalText: skill,
      sourceSection: "technical_skills.tools",
      sourceTitle: "Technical Skills: Tools"
    });
  }

  for (const skill of masterCv.hidden_context.keywords) {
    pushEvidence(items, {
      originalText: skill,
      sourceSection: "hidden_context.keywords",
      sourceTitle: "Hidden Context Keywords",
      evidenceStrength: 0.78
    });
  }

  for (const detail of masterCv.hidden_context.additional_experience) {
    pushEvidence(items, {
      explicitOrInferred: "inferred",
      originalText: detail,
      sourceSection: "hidden_context.additional_experience",
      sourceTitle: "Hidden Context Additional Experience",
      evidenceStrength: 0.62
    });
  }

  for (const item of masterCv.work_experience) {
    const recency = recencyFor(item.end_date, item.current);
    pushEvidence(items, {
      originalText: item.title,
      sourceSection: "work_experience.title",
      sourceTitle: `${item.company}: title`,
      recency
    });
    pushEvidence(items, {
      explicitOrInferred: "inferred",
      originalText: item.description,
      sourceSection: "work_experience.description",
      sourceTitle: `${item.company}: description`,
      evidenceStrength: 0.68,
      recency
    });

    for (const skill of [
      ...item.hard_skills,
      ...item.soft_skills,
      ...item.programming_languages,
      ...item.frameworks,
      ...item.cms,
      ...item.tools
    ]) {
      pushEvidence(items, {
        originalText: skill,
        sourceSection: "work_experience.skills",
        sourceTitle: `${item.company}: experience skills`,
        recency
      });
    }
  }

  for (const project of masterCv.projects) {
    pushEvidence(items, {
      originalText: project.title,
      sourceSection: "projects.title",
      sourceTitle: `${project.client || "Project"}: title`,
      evidenceStrength: 0.74
    });
    pushEvidence(items, {
      explicitOrInferred: "inferred",
      originalText: project.description,
      sourceSection: "projects.description",
      sourceTitle: `${project.title}: description`,
      evidenceStrength: 0.63
    });
  }

  for (const certification of masterCv.certifications) {
    pushEvidence(items, {
      originalText: certification,
      sourceSection: "certifications",
      sourceTitle: "Certifications",
      evidenceStrength: 0.98
    });
  }

  for (const language of masterCv.languages) {
    pushEvidence(items, {
      originalText: language,
      sourceSection: "languages",
      sourceTitle: "Languages",
      evidenceStrength: 0.95
    });
  }

  const frequencies = frequencyMap(items.map((item) => item.normalizedCapability));

  return items.map((item) => ({
    ...item,
    frequency: frequencies.get(item.normalizedCapability) ?? 1
  }));
}

function pushEvidence(
  collection: Array<Omit<CvEvidence, "frequency">>,
  input: {
    explicitOrInferred?: "explicit" | "inferred";
    evidenceStrength?: number;
    originalText: string;
    recency?: number | null;
    sourceSection: string;
    sourceTitle: string;
  }
) {
  const originalText = input.originalText?.trim();

  if (!originalText) {
    return;
  }

  collection.push({
    evidenceStrength: input.evidenceStrength ?? (input.explicitOrInferred === "inferred" ? 0.66 : 0.9),
    explicitOrInferred: input.explicitOrInferred ?? "explicit",
    id: `${input.sourceSection}:${normalize(originalText)}:${collection.length}`,
    normalizedCapability: normalize(originalText),
    originalText,
    recency: input.recency ?? null,
    sourceSection: input.sourceSection,
    sourceTitle: input.sourceTitle
  });
}

function matchRequirementsToEvidence(
  requirements: ClassifiedRequirement[],
  evidenceItems: CvEvidence[]
) {
  const matches = requirements.map((requirement) => {
    const candidates = evidenceItems
      .map((evidence) => matchRequirementToEvidence(requirement, evidence))
      .filter((candidate): candidate is EvidenceMatch => candidate !== null)
      .sort((left, right) => right.matchScore - left.matchScore || right.confidenceScore - left.confidenceScore);
    const best = candidates[0];

    if (!best) {
      return {
        confidenceScore: Number((requirement.confidenceScore * 0.45).toFixed(2)),
        evidenceReferences: [],
        matchScore: 0,
        reason:
          requirement.isGeneric || requirement.category === "behavioral competency"
            ? "No direct evidence found; absence of explicit evidence is treated cautiously for low-signal or behavioral requirements."
            : "No direct evidence found in the CV evidence set.",
        requirementId: requirement.id,
        status: requirement.isGeneric ? "unknown" : "unsupported"
      } satisfies RequirementMatch;
    }

    return {
      confidenceScore: Number(best.confidenceScore.toFixed(2)),
      evidenceReferences: [best.evidence.sourceTitle],
      matchScore: Number(best.matchScore.toFixed(2)),
      reason: best.reason,
      requirementId: requirement.id,
      status: statusForMatchScore(best.matchScore, best.confidenceScore)
    } satisfies RequirementMatch;
  });

  return matches.map((match) => {
    const requirement = requirements.find((item) => item.id === match.requirementId);

    if (!requirement?.groupId) {
      return match;
    }

    const siblingMatches = matches.filter((item) => {
      const sibling = requirements.find((candidate) => candidate.id === item.requirementId);
      return sibling?.groupId === requirement.groupId;
    });
    const bestSibling = siblingMatches.reduce<RequirementMatch | null>((best, current) => {
      if (!best) {
        return current;
      }

      return current.matchScore > best.matchScore ? current : best;
    }, null);

    if (
      bestSibling &&
      bestSibling.requirementId !== match.requirementId &&
      (bestSibling.status === "supported" || bestSibling.status === "likelySupported") &&
      (match.status === "unsupported" || match.status === "unknown")
    ) {
      return {
        ...match,
        confidenceScore: Math.max(match.confidenceScore, 0.55),
        reason: `Alternative requirement group satisfied by ${bestSibling.evidenceReferences[0] ?? "other CV evidence"}.`,
        status: "unknown"
      } satisfies RequirementMatch;
    }

    return match;
  });
}

function matchRequirementToEvidence(
  requirement: ClassifiedRequirement,
  evidence: CvEvidence
): EvidenceMatch | null {
  const similarity = capabilitySimilarity(
    requirement.normalizedText,
    evidence.normalizedCapability
  );

  if (similarity <= 0) {
    return null;
  }

  const recencyBoost = evidence.recency === null ? 0.02 : clamp((5 - evidence.recency) * 0.03, 0, 0.12);
  const frequencyBoost = clamp((evidence.frequency - 1) * 0.04, 0, 0.16);
  const matchScore = clamp(
    similarity * 0.75 + evidence.evidenceStrength * 0.2 + recencyBoost + frequencyBoost,
    0,
    1
  );
  const confidenceScore = clamp(
    requirement.confidenceScore * 0.45 +
      evidence.evidenceStrength * 0.35 +
      similarity * 0.2,
    0,
    1
  );

  return {
    confidenceScore,
    evidence,
    matchScore,
    reason:
      similarity >= 0.95
        ? `Direct capability match found in ${evidence.sourceTitle}.`
        : similarity >= 0.7
          ? `Strong related capability evidence found in ${evidence.sourceTitle}.`
          : `Partial capability overlap found in ${evidence.sourceTitle}.`
  };
}

function buildScoreBreakdown({
  constraintRisk,
  extractedCvEvidence,
  extractionQuality,
  requirementMatches,
  requirements,
  seniorityAlignment,
  titleDescriptionConsistencyWarning
}: {
  constraintRisk: number;
  extractedCvEvidence: CvEvidence[];
  extractionQuality: ExtractionQuality;
  requirementMatches: RequirementMatch[];
  requirements: ClassifiedRequirement[];
  seniorityAlignment: number;
  titleDescriptionConsistencyWarning: string | null;
}): ScoreBreakdown {
  const qualityDampener = clamp(
    extractionQuality.requirementExtractionConfidence * 0.65 +
      (1 - extractionQuality.genericRequirementRatio) * 0.2 +
      (1 - extractionQuality.vagueRequirementRatio) * 0.15,
    0.35,
    1
  );
  const coreRequirementFit = scoreRequirementCategory({
    matchSet: new Set(["supported", "likelySupported", "weaklySupported", "unknown", "unsupported"]),
    requirements: requirements.filter((requirement) =>
      requirement.category === "core requirement" ||
      requirement.category === "tool or platform" ||
      requirement.category === "methodology/process" ||
      requirement.category === "domain or industry knowledge" ||
      requirement.category === "certification or credential"
    ),
    requirementMatches,
    qualityDampener
  });
  const responsibilityFit = scoreRequirementCategory({
    matchSet: new Set(["supported", "likelySupported", "weaklySupported", "unknown", "unsupported"]),
    requirements: requirements.filter((requirement) => requirement.category === "responsibility"),
    requirementMatches,
    qualityDampener
  });
  const preferredRequirementFit = scoreRequirementCategory({
    matchSet: new Set(["supported", "likelySupported", "weaklySupported", "unknown", "unsupported"]),
    requirements: requirements.filter((requirement) =>
      requirement.category === "preferred requirement" ||
      requirement.category === "supporting requirement"
    ),
    requirementMatches,
    qualityDampener
  });
  const evidenceStrength = evidenceStrengthDimension(extractedCvEvidence, requirementMatches);
  const assessmentConfidence = assessmentConfidenceFor({
    extractionQuality,
    qualityDampener,
    requirementMatches,
    titleDescriptionConsistencyWarning
  });
  const overallFitScore = clamp(
    coreRequirementFit * 0.25 +
      responsibilityFit * 0.18 +
      preferredRequirementFit * 0.12 +
      evidenceStrength * 0.16 +
      seniorityAlignment * 0.14 +
      (10 - constraintRisk) * 0.15,
    0,
    10
  );

  return {
    assessmentConfidence: Number(assessmentConfidence.toFixed(1)),
    constraintRisk: Number(constraintRisk.toFixed(1)),
    coreRequirementFit: Number(coreRequirementFit.toFixed(1)),
    evidenceStrength: Number(evidenceStrength.toFixed(1)),
    overallFitScore: Number(overallFitScore.toFixed(1)),
    preferredRequirementFit: Number(preferredRequirementFit.toFixed(1)),
    responsibilityFit: Number(responsibilityFit.toFixed(1)),
    seniorityAlignment: Number(seniorityAlignment.toFixed(1))
  };
}

function scoreRequirementCategory({
  matchSet,
  qualityDampener,
  requirementMatches,
  requirements
}: {
  matchSet: Set<MatchStatus>;
  qualityDampener: number;
  requirementMatches: RequirementMatch[];
  requirements: ClassifiedRequirement[];
}) {
  if (requirements.length === 0) {
    return 5.5 * qualityDampener + 3.5;
  }

  let weightTotal = 0;
  let weightedScore = 0;
  const processedGroups = new Set<string>();

  for (const requirement of requirements) {
    if (requirement.groupId) {
      if (processedGroups.has(requirement.groupId)) {
        continue;
      }

      processedGroups.add(requirement.groupId);
      const groupRequirements = requirements.filter(
        (item) => item.groupId === requirement.groupId
      );
      const groupMatches = groupRequirements
        .map((item) => requirementMatches.find((match) => match.requirementId === item.id))
        .filter((item): item is RequirementMatch => Boolean(item))
        .filter((item) => matchSet.has(item.status));

      if (groupMatches.length === 0) {
        continue;
      }

      const strongestRequirement = groupRequirements.reduce((best, current) =>
        current.importanceScore * current.confidenceScore >
        best.importanceScore * best.confidenceScore
          ? current
          : best
      );
      const bestMatch = groupMatches.reduce((best, current) =>
        current.matchScore > best.matchScore ? current : best
      );
      const weight =
        strongestRequirement.importanceScore * strongestRequirement.confidenceScore;
      const dampenedScore =
        matchScoreValue(bestMatch.status) *
        (strongestRequirement.isGeneric ? 0.45 : qualityDampener) *
        (bestMatch.status === "unknown" ? 0.75 : 1);
      weightTotal += weight;
      weightedScore += dampenedScore * weight;
      continue;
    }

    const match = requirementMatches.find((item) => item.requirementId === requirement.id);

    if (!match || !matchSet.has(match.status)) {
      continue;
    }

    const weight = requirement.importanceScore * requirement.confidenceScore;
    const dampenedScore =
      matchScoreValue(match.status) *
      (requirement.isGeneric ? 0.45 : qualityDampener) *
      (match.status === "unknown" ? 0.75 : 1);
    weightTotal += weight;
    weightedScore += dampenedScore * weight;
  }

  if (weightTotal === 0) {
    return 5;
  }

  return clamp((weightedScore / weightTotal) * 10, 0, 10);
}

function evidenceStrengthDimension(
  evidenceItems: CvEvidence[],
  requirementMatches: RequirementMatch[]
) {
  if (evidenceItems.length === 0) {
    return 2.5;
  }

  const matchedEvidenceTitles = new Set(
    requirementMatches.flatMap((match) => match.evidenceReferences)
  );
  const matchedEvidence = evidenceItems.filter((evidence) =>
    matchedEvidenceTitles.has(evidence.sourceTitle)
  );
  const evidencePool = matchedEvidence.length > 0 ? matchedEvidence : evidenceItems;
  const strength =
    average(
      evidencePool.map((item) =>
        clamp(
          item.evidenceStrength * 0.65 +
            Math.min(1, item.frequency / 3) * 0.2 +
            (item.recency === null ? 0.12 : Math.max(0, 1 - item.recency / 8) * 0.15),
          0,
          1
        )
      )
    ) * 10;

  return clamp(strength, 0, 10);
}

function seniorityAlignmentFor(job: ParsedJobProfile, evidenceItems: CvEvidence[]) {
  const requested = normalize(job.seniority ?? "");

  if (!requested) {
    return 6.5;
  }

  const evidenceText = normalize(
    evidenceItems
      .filter((item) => item.sourceSection === "basics" || item.sourceSection === "work_experience.title")
      .map((item) => item.originalText)
      .join(" ")
  );

  if (/principal|staff/.test(requested)) {
    return /\bprincipal\b|\bstaff\b|\blead\b|\bhead\b/.test(evidenceText) ? 8.2 : 4.3;
  }

  if (/lead/.test(requested)) {
    return /\blead\b|\bmanager\b|\bhead\b|\bsenior\b/.test(evidenceText) ? 7.8 : 4.8;
  }

  if (/senior/.test(requested)) {
    return /\bsenior\b|\blead\b|\bmanager\b|\bstaff\b|\bprincipal\b/.test(evidenceText)
      ? 7.6
      : 5.2;
  }

  if (/junior|entry|associate/.test(requested)) {
    return 6.8;
  }

  return 6.2;
}

function constraintRiskFor(
  requirements: ClassifiedRequirement[],
  matches: RequirementMatch[],
  applicationContext: Partial<ApplicationContext> | undefined,
  masterCv: MasterCv,
  job: ParsedJobProfile
) {
  const blockingRequirements = requirements.filter((requirement) => requirement.isBlockingRequirement);
  const blockingMatches = blockingRequirements.map((requirement) =>
    matches.find((match) => match.requirementId === requirement.id)
  );
  let risk = 0;

  for (const match of blockingMatches) {
    if (!match) {
      risk += 2.2;
      continue;
    }

    if (match.status === "unsupported") {
      risk += 2.4;
    } else if (match.status === "unknown") {
      risk += 1.2;
    } else if (match.status === "weaklySupported") {
      risk += 0.8;
    }
  }

  const rawConstraintText = normalize(
    [job.location ?? "", applicationContext?.companyContext ?? "", applicationContext?.jobContext ?? ""].join(
      " "
    )
  );
  const cvConstraintText = normalize(
    [masterCv.basics.location, masterCv.summary, ...masterCv.certifications].join(" ")
  );
  const hasRestrictedLocationConstraint = /\bon site|onsite|hybrid|relocation\b/.test(
    rawConstraintText
  );

  if (/\bclearance|public trust|secret clearance|top secret\b/.test(rawConstraintText)) {
    risk += /\bclearance|public trust|secret clearance|top secret\b/.test(cvConstraintText)
      ? 0
      : 2.6;
  }

  if (/\bus citizen|u s citizen|permanent resident|green card|work authorization|visa sponsorship\b/.test(rawConstraintText)) {
    risk += /\bus citizen|u s citizen|permanent resident|green card|work authorization|visa sponsorship\b/.test(
      cvConstraintText
    )
      ? 0
      : 2.2;
  }

  if (hasRestrictedLocationConstraint && /\bremote\b/.test(cvConstraintText)) {
    risk += 1.4;
  }

  return clamp(risk, 0, 10);
}

function assessmentConfidenceFor({
  extractionQuality,
  qualityDampener,
  requirementMatches,
  titleDescriptionConsistencyWarning
}: {
  extractionQuality: ExtractionQuality;
  qualityDampener: number;
  requirementMatches: RequirementMatch[];
  titleDescriptionConsistencyWarning: string | null;
}) {
  const matchConfidence =
    requirementMatches.length === 0
      ? 0.45
      : average(requirementMatches.map((match) => match.confidenceScore));
  const titlePenalty = titleDescriptionConsistencyWarning ? 0.12 : 0;

  return clamp(
    (extractionQuality.requirementExtractionConfidence * 0.45 +
      extractionQuality.requiredSkillQualityScore * 0.2 +
      qualityDampener * 0.15 +
      matchConfidence * 0.2 -
      titlePenalty) * 10,
    0,
    10
  );
}

function generationDecisionFor({
  extractionQuality,
  matches,
  requirements,
  scoreBreakdown
}: {
  extractionQuality: ExtractionQuality;
  matches: RequirementMatch[];
  requirements: ClassifiedRequirement[];
  scoreBreakdown: ScoreBreakdown;
}): GenerationDecision {
  const highConfidenceUnsupportedBlockers = requirements.filter((requirement) => {
    if (!requirement.isBlockingRequirement) {
      return false;
    }

    const match = matches.find((item) => item.requirementId === requirement.id);
    return (
      requirement.confidenceScore >= 0.72 &&
      (match?.status === "unsupported" ||
        (match?.status === "unknown" && match.confidenceScore >= 0.72))
    );
  });
  const criticalUnsupportedCore = requirements.filter((requirement) => {
    const match = matches.find((item) => item.requirementId === requirement.id);

    return (
      requirement.category === "core requirement" &&
      !requirement.isGeneric &&
      requirement.importanceScore >= 0.85 &&
      requirement.confidenceScore >= 0.75 &&
      (match?.status === "unsupported" || match?.status === "unknown")
    );
  });
  const uniqueCriticalUnsupportedCore = new Set(
    criticalUnsupportedCore.map((requirement) => requirement.groupId ?? requirement.id)
  );

  if (
    highConfidenceUnsupportedBlockers.length > 0 ||
    uniqueCriticalUnsupportedCore.size >= 3
  ) {
    return "BLOCK";
  }

  if (
    scoreBreakdown.assessmentConfidence < 5.5 ||
    extractionQuality.requirementExtractionConfidence < 0.58 ||
    scoreBreakdown.constraintRisk >= 4.5 ||
    scoreBreakdown.overallFitScore < 5
  ) {
    return "ALLOW_WITH_WARNING";
  }

  return "ALLOW";
}

function titleDescriptionConsistencyWarningFor(job: ParsedJobProfile) {
  const titleTokens = significantTitleTokens(job.positionTitle ?? "");

  if (titleTokens.length === 0) {
    return null;
  }

  const evidenceText = normalize(
    [...job.requiredSkills, ...job.preferredSkills, ...job.responsibilities, ...job.keywords].join(" ")
  );
  const alignedCount = titleTokens.filter((token) => evidenceText.includes(token)).length;
  const ratio = alignedCount / titleTokens.length;

  if (ratio >= 0.34) {
    return null;
  }

  return "The declared job title appears weakly aligned with the extracted responsibilities and requirements, which lowers assessment confidence.";
}

function riskFlagsFor({
  applicationContext,
  extractionQuality,
  generationDecision,
  masterCv,
  matches,
  parsedJobProfile,
  requirements,
  titleDescriptionConsistencyWarning
}: {
  applicationContext?: Partial<ApplicationContext>;
  extractionQuality: ExtractionQuality;
  generationDecision: GenerationDecision;
  masterCv: MasterCv;
  matches: RequirementMatch[];
  parsedJobProfile: ParsedJobProfile;
  requirements: ClassifiedRequirement[];
  titleDescriptionConsistencyWarning: string | null;
}) {
  const flags = [];
  const jobText = normalize(
    [
      parsedJobProfile.positionTitle ?? "",
      parsedJobProfile.location ?? "",
      ...parsedJobProfile.requiredSkills,
      ...parsedJobProfile.preferredSkills,
      ...parsedJobProfile.responsibilities,
      ...parsedJobProfile.keywords,
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

  if (
    /\bclearance|public trust|secret clearance|top secret\b/.test(jobText) &&
    !/\bclearance|public trust|secret clearance|top secret\b/.test(cvText)
  ) {
    flags.push("Job mentions clearance or public trust requirements not found in the Master CV.");
  }

  if (
    /\bus citizen|u s citizen|permanent resident|green card|work authorization|visa sponsorship\b/.test(
      jobText
    ) &&
    !/\bus citizen|u s citizen|permanent resident|green card|work authorization|visa sponsorship\b/.test(
      cvText
    )
  ) {
    flags.push("Job mentions legal authorization requirements not found in the Master CV.");
  }

  if (
    /\bon site|onsite|hybrid|relocation\b/.test(jobText) &&
    /\bremote|ecuador|guayaquil\b/.test(cvText)
  ) {
    flags.push("Job may have location expectations that should be checked before applying.");
  }

  if (extractionQuality.genericRequirementRatio >= 0.35) {
    flags.push("A large share of extracted requirements are generic low-signal phrases, which lowers assessment reliability.");
  }

  if (extractionQuality.vagueRequirementRatio >= 0.35) {
    flags.push("The extracted requirements are unusually vague, which lowers assessment confidence.");
  }

  if (titleDescriptionConsistencyWarning) {
    flags.push(titleDescriptionConsistencyWarning);
  }

  if (generationDecision === "BLOCK") {
    flags.push("High-confidence blockers or multiple critical unsupported requirements were detected.");
  }

  for (const requirement of requirements) {
    if (!requirement.isBlockingRequirement) {
      continue;
    }

    const match = matches.find((item) => item.requirementId === requirement.id);
    if (match?.status === "unsupported") {
      flags.push(`Potential blocker appears unsupported: ${requirement.originalText}.`);
    }
  }

  return unique(flags);
}

function buildCompatibilityAssessment({
  classifiedRequirements,
  extractedCvEvidence,
  extractionQuality,
  generationDecision,
  parsedJobProfile,
  requirementMatches,
  riskFlags,
  scoreBreakdown,
  titleDescriptionConsistencyWarning
}: {
  classifiedRequirements: ClassifiedRequirement[];
  extractedCvEvidence: CvEvidence[];
  extractionQuality: ExtractionQuality;
  generationDecision: GenerationDecision;
  parsedJobProfile: ParsedJobProfile;
  requirementMatches: RequirementMatch[];
  riskFlags: string[];
  scoreBreakdown: ScoreBreakdown;
  titleDescriptionConsistencyWarning: string | null;
}): ApplicationFitAssessment {
  const requiredRequirements = classifiedRequirements.filter(
    (requirement) =>
      requirement.sourceSection === "required_skills" &&
      requirement.category !== "generic low-signal phrase"
  );
  const preferredRequirements = classifiedRequirements.filter(
    (requirement) =>
      requirement.sourceSection === "preferred_skills" &&
      requirement.category !== "generic low-signal phrase"
  );
  const requirementById = new Map(
    classifiedRequirements.map((requirement) => [requirement.id, requirement])
  );
  const groupSatisfied = (groupId: string | undefined) => {
    if (!groupId) {
      return false;
    }

    return requirementMatches.some((match) => {
      const requirement = requirementById.get(match.requirementId);
      return (
        requirement?.groupId === groupId &&
        (match.status === "supported" || match.status === "likelySupported")
      );
    });
  };
  const coreRequirementsMatched = requiredRequirements
    .filter((requirement) => {
      const match = requirementMatches.find((item) => item.requirementId === requirement.id);
      return match?.status === "supported" || match?.status === "likelySupported";
    })
    .map((requirement) => requirement.originalText)
    .filter((value, index, items) => items.indexOf(value) === index)
    .slice(0, 8);
  const coreRequirementsMissing = requiredRequirements
    .filter((requirement) => {
      const match = requirementMatches.find((item) => item.requirementId === requirement.id);
      if (groupSatisfied(requirement.groupId)) {
        return false;
      }
      return (
        (match?.status === "unsupported" || match?.status === "unknown") &&
        requirement.importanceScore >= 0.55 &&
        requirement.confidenceScore >= 0.55
      );
    })
    .map((requirement) => requirement.originalText)
    .slice(0, 8);
  const matchedPreferredRequirements = preferredRequirements
    .filter((requirement) => {
      const match = requirementMatches.find((item) => item.requirementId === requirement.id);
      return match?.status === "supported" || match?.status === "likelySupported";
    })
    .map((requirement) => requirement.originalText)
    .slice(0, 6);
  const strongMatches = classifiedRequirements
    .filter((requirement) => {
      const match = requirementMatches.find((item) => item.requirementId === requirement.id);
      return (
        (match?.status === "supported" || match?.status === "likelySupported") &&
        requirement.importanceScore >= 0.5 &&
        !requirement.isGeneric
      );
    })
    .map((requirement) => requirement.originalText)
    .slice(0, 6);
  const gaps = classifiedRequirements
    .filter((requirement) => {
      const match = requirementMatches.find((item) => item.requirementId === requirement.id);
      if (groupSatisfied(requirement.groupId)) {
        return false;
      }
      return (
        !requirement.isGeneric &&
        requirement.importanceScore >= 0.55 &&
        (match?.status === "unsupported" || match?.status === "weaklySupported")
      );
    })
    .map((requirement) => requirement.originalText)
    .slice(0, 6);
  const knowledgeToGain = unique([
    ...coreRequirementsMissing,
    ...preferredRequirements
      .filter((requirement) => {
        const match = requirementMatches.find((item) => item.requirementId === requirement.id);
        if (groupSatisfied(requirement.groupId)) {
          return false;
        }
        return match?.status === "unsupported" || match?.status === "unknown";
      })
      .map((requirement) => requirement.originalText)
  ]).slice(0, 6);
  const improvementAreas = unique(
    gaps.map((gap) => `Build stronger, more explicit evidence around ${gap}.`)
  ).slice(0, 6);
  const fitScore = scoreBreakdown.overallFitScore;
  const recommendation = recommendationFor(fitScore);
  const decision = compatibilityDecisionFor({
    fitScore,
    generationDecision,
    riskFlags
  });
  const summary = compatibilitySummaryFor({
    coreRequirementsMatched,
    coreRequirementsMissing,
    decision,
    extractionQuality,
    fitScore,
    generationDecision,
    titleDescriptionConsistencyWarning
  });

  return {
    classifiedRequirements,
    coreRequirementsMatched,
    coreRequirementsMissing,
    decision: decision.label,
    decisionTone: decision.tone,
    explanation: explainAssessment({
      coreRequirementsMatched,
      coreRequirementsMissing,
      extractionQuality,
      fitScore,
      generationDecision,
      riskFlags,
      titleDescriptionConsistencyWarning
    }),
    extractedCvEvidence,
    extractionQuality,
    fitScore,
    gaps,
    generationDecision,
    improvementAreas,
    knowledgeToGain,
    matchedPreferredRequirements,
    parsedJobProfile,
    recommendation,
    requirementMatches,
    riskFlags,
    scoreBreakdown,
    strongMatches,
    summary,
    titleDescriptionConsistencyWarning
  };
}

function compatibilityDecisionFor({
  fitScore,
  generationDecision,
  riskFlags
}: {
  fitScore: number;
  generationDecision: GenerationDecision;
  riskFlags: string[];
}) {
  if (generationDecision === "BLOCK") {
    return {
      label: "Explore another opportunity" as const,
      tone: "danger" as const
    };
  }

  if (fitScore >= 7.2 && riskFlags.length === 0) {
    return {
      label: "Ready to submit" as const,
      tone: "success" as const
    };
  }

  return {
    label: "Worth optimizing" as const,
    tone: "warning" as const
  };
}

function compatibilitySummaryFor({
  coreRequirementsMatched,
  coreRequirementsMissing,
  decision,
  extractionQuality,
  fitScore,
  generationDecision,
  titleDescriptionConsistencyWarning
}: {
  coreRequirementsMatched: string[];
  coreRequirementsMissing: string[];
  decision: { label: ApplicationFitAssessment["decision"] };
  extractionQuality: ExtractionQuality;
  fitScore: number;
  generationDecision: GenerationDecision;
  titleDescriptionConsistencyWarning: string | null;
}) {
  const reliability =
    extractionQuality.requirementExtractionConfidence >= 0.75
      ? "high"
      : extractionQuality.requirementExtractionConfidence >= 0.55
        ? "moderate"
        : "low";
  const consistencyNote = titleDescriptionConsistencyWarning
    ? " Title and description alignment is uncertain."
    : "";

  return `${decision.label}: fit ${fitScore.toFixed(1)}/10 with ${coreRequirementsMatched.length} clearly supported core requirements, ${coreRequirementsMissing.length} notable unsupported or uncertain core requirements, and ${reliability} extraction confidence.${consistencyNote} Generation decision: ${generationDecision}.`;
}

function explainAssessment({
  coreRequirementsMatched,
  coreRequirementsMissing,
  extractionQuality,
  fitScore,
  generationDecision,
  riskFlags,
  titleDescriptionConsistencyWarning
}: {
  coreRequirementsMatched: string[];
  coreRequirementsMissing: string[];
  extractionQuality: ExtractionQuality;
  fitScore: number;
  generationDecision: GenerationDecision;
  riskFlags: string[];
  titleDescriptionConsistencyWarning: string | null;
}) {
  const matchedSummary =
    coreRequirementsMatched.length > 0
      ? `Supported core requirements include ${coreRequirementsMatched.join(", ")}.`
      : "No high-confidence core requirements were clearly supported.";
  const gapSummary =
    coreRequirementsMissing.length > 0
      ? `Notable unsupported or uncertain core requirements include ${coreRequirementsMissing.join(", ")}.`
      : "No major core requirement gaps were identified.";
  const confidenceSummary = `Requirement extraction confidence is ${Math.round(
    extractionQuality.requirementExtractionConfidence * 100
  )}% and the overall fit score is ${fitScore.toFixed(1)}/10.`;
  const titleSummary = titleDescriptionConsistencyWarning
    ? ` ${titleDescriptionConsistencyWarning}`
    : "";
  const riskSummary =
    riskFlags.length > 0
      ? ` Risk flags: ${riskFlags.join(" ")}`
      : "";

  return `${matchedSummary} ${gapSummary} ${confidenceSummary} Generation decision is ${generationDecision}.${titleSummary}${riskSummary}`.trim();
}

function capabilitySimilarity(left: string, right: string) {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  if (left.includes(right) || right.includes(left)) {
    return 0.88;
  }

  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  const containment = Math.max(intersection / leftTokens.size, intersection / rightTokens.size);
  const jaccard = intersection / union;
  const prefixBonus =
    [...leftTokens].some((token) =>
      [...rightTokens].some((candidate) => token.startsWith(candidate) || candidate.startsWith(token))
    )
      ? 0.08
      : 0;

  if (intersection === 0) {
    return 0;
  }

  return clamp(containment * 0.65 + jaccard * 0.35 + prefixBonus, 0, 0.95);
}

function matchScoreValue(status: MatchStatus) {
  if (status === "supported") {
    return 1;
  }

  if (status === "likelySupported") {
    return 0.75;
  }

  if (status === "weaklySupported") {
    return 0.45;
  }

  if (status === "unknown") {
    return 0.25;
  }

  return 0;
}

function statusForMatchScore(matchScore: number, confidenceScore: number): MatchStatus {
  if (matchScore >= 0.86 && confidenceScore >= 0.72) {
    return "supported";
  }

  if (matchScore >= 0.68) {
    return "likelySupported";
  }

  if (matchScore >= 0.46) {
    return "weaklySupported";
  }

  if (confidenceScore >= 0.45) {
    return "unknown";
  }

  return "unsupported";
}

function requirementCategoryFor({
  isGeneric,
  normalizedText,
  sourceSection
}: {
  isGeneric: boolean;
  normalizedText: string;
  sourceSection: RequirementSourceSection;
}): RequirementCategory {
  if (isGeneric) {
    return sourceSection === "responsibilities"
      ? "behavioral competency"
      : "generic low-signal phrase";
  }

  if (blockingLocationConstraintPattern.test(normalizedText) || sourceSection === "location") {
    return "location, legal, or availability constraint";
  }

  if (credentialPattern.test(normalizedText)) {
    return "certification or credential";
  }

  if (behavioralCompetencyPattern.test(normalizedText)) {
    return "behavioral competency";
  }

  if (domainKnowledgePattern.test(normalizedText)) {
    return "domain or industry knowledge";
  }

  if (methodologyPattern.test(normalizedText)) {
    return "supporting requirement";
  }

  if (toolPlatformPattern.test(normalizedText)) {
    return "tool or platform";
  }

  if (sourceSection === "preferred_skills") {
    return "preferred requirement";
  }

  if (sourceSection === "responsibilities") {
    return "responsibility";
  }

  if (sourceSection === "keywords") {
    return "supporting requirement";
  }

  return "core requirement";
}

function requirementConfidenceFor({
  category,
  normalizedText,
  sourceSection
}: {
  category: RequirementCategory;
  normalizedText: string;
  sourceSection: RequirementSourceSection;
}) {
  let score =
    sourceSection === "required_skills"
      ? 0.86
      : sourceSection === "preferred_skills"
        ? 0.72
        : sourceSection === "responsibilities"
          ? 0.68
          : sourceSection === "location"
            ? 0.9
            : 0.52;

  if (category === "generic low-signal phrase") {
    score -= 0.3;
  }

  if (normalizedText.split(" ").length > 8) {
    score -= 0.12;
  }

  if (vagueRequirementPattern.test(normalizedText)) {
    score -= 0.12;
  }

  return clamp(score, 0.15, 0.95);
}

function requirementImportanceFor({
  category,
  isGeneric,
  normalizedText,
  sourceSection
}: {
  category: RequirementCategory;
  isGeneric: boolean;
  normalizedText: string;
  sourceSection: RequirementSourceSection;
}) {
  let score =
    sourceSection === "required_skills"
      ? 0.9
      : sourceSection === "preferred_skills"
        ? 0.5
        : sourceSection === "responsibilities"
          ? 0.58
          : sourceSection === "location"
            ? 0.95
            : 0.35;

  if (category === "certification or credential") {
    score = Math.max(score, 0.95);
  }

  if (category === "location, legal, or availability constraint") {
    score = Math.max(score, 0.95);
  }

  if (category === "behavioral competency") {
    score -= 0.22;
  }

  if (isGeneric || genericLowSignalPattern.test(normalizedText)) {
    score -= 0.38;
  }

  return clamp(score, 0.1, 1);
}

function isBlockingRequirementFor({
  category,
  confidenceScore,
  importanceScore,
  normalizedText
}: {
  category: RequirementCategory;
  confidenceScore: number;
  importanceScore: number;
  normalizedText: string;
}) {
  if (category === "location, legal, or availability constraint") {
    return confidenceScore >= 0.7;
  }

  if (category === "certification or credential") {
    return confidenceScore >= 0.72;
  }

  if (languageRequirementPattern.test(normalizedText)) {
    return confidenceScore >= 0.72;
  }

  return importanceScore >= 0.95 && confidenceScore >= 0.86;
}

function isGenericLowSignalPhrase(normalizedText: string) {
  return (
    genericLowSignalPhrases.has(normalizedText) ||
    genericLowSignalPattern.test(normalizedText)
  );
}

function significantTitleTokens(value: string) {
  return [...tokenSet(normalize(value))].filter((token) => !genericTitleTokens.has(token));
}

function tokenSet(value: string) {
  return new Set(splitTerms(value).map(stemToken).filter(Boolean));
}

function splitTerms(value: string) {
  return value
    .split(/,|\n|;|\||\/|•|-|\(|\)|\s+/)
    .map((term) => normalize(term))
    .filter((term) => term.length > 2 && !stopWords.has(term));
}

function stemToken(token: string) {
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith("ing") && token.length > 5) {
    return token.slice(0, -3);
  }

  if (token.endsWith("ed") && token.length > 4) {
    return token.slice(0, -2);
  }

  if (token.endsWith("s") && token.length > 4) {
    return token.slice(0, -1);
  }

  return token;
}

function frequencyMap(values: string[]) {
  const map = new Map<string, number>();

  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }

  return map;
}

function recencyFor(endDate: string, current: boolean) {
  if (current) {
    return 0;
  }

  const year = Number.parseInt(endDate, 10);

  if (!Number.isFinite(year)) {
    return null;
  }

  return Math.max(0, new Date().getFullYear() - year);
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
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

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

const genericLowSignalPhrases = new Set([
  "adaptability",
  "attention to detail",
  "collaboration",
  "communication",
  "detail oriented",
  "fast paced",
  "problem solving",
  "self starter",
  "team player",
  "teamwork",
  "willingness to learn"
]);

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

const genericTitleTokens = new Set([
  "analyst",
  "assistant",
  "associate",
  "consultant",
  "coordinator",
  "developer",
  "director",
  "engineer",
  "executive",
  "head",
  "junior",
  "lead",
  "manager",
  "officer",
  "principal",
  "senior",
  "specialist",
  "staff"
]);

const credentialPattern =
  /\b(certification|certified|license|licensed|credential|degree|bachelor|master|doctorate|phd|pmp|cpa|rn)\b/;
const blockingLocationConstraintPattern =
  /\b(hybrid|on site|onsite|relocation|travel|shift|weekend|time zone|timezone|authorization|visa|citizen|citizenship|resident|clearance)\b/;
const behavioralCompetencyPattern =
  /\b(communication|problem solving|adaptability|teamwork|team leadership|leadership|detail oriented|self starter|fast paced|collaboration|stakeholder management)\b/;
const domainKnowledgePattern =
  /\b(domain|industry|regulatory|compliance|operations|healthcare|finance|education|manufacturing|defense|maritime|retail|public sector)\b/;
const methodologyPattern =
  /\b(methodology|process|workflow|lifecycle|agile|scrum|kanban|quality assurance|process improvement|strategic planning|project management)\b/;
const toolPlatformPattern =
  /[+#./]|\b(platform|system|software|tool|suite|application|database|crm|erp)\b/;
const languageRequirementPattern = /\b(english|spanish|french|german|portuguese|bilingual|multilingual)\b/;
const vagueRequirementPattern =
  /\b(experience|knowledge|ability|capability|background|exposure|familiarity)\b/;
const genericLowSignalPattern =
  /\b(communication|teamwork|problem solving|adaptability|detail oriented|self starter|fast paced|willingness to learn)\b/;
