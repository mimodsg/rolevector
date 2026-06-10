import { readFileSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { env } from "@/lib/env";
import { masterCvSchema, type MasterCv } from "@/lib/schemas/master-cv";
import { type ParsedJob } from "@/lib/schemas/job";
import { assessApplicationFit } from "./application-fit";
import {
  applicationContextToText,
  type ApplicationContext
} from "./application-context";
import {
  normalizeAgentScore,
  roleDecisionFromFitScore,
  shouldGenerateCvForAssessment,
  workflowStatusForOutcome,
  type WorkflowStatus
} from "./cv-optimization-logic";
import { generateCoverLetter } from "./cover-letter-generator";
import { scoreAtsCompatibility } from "./ats-scoring";

const openai = env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: env.OPENAI_API_KEY
    })
  : null;

type JobProfile = {
  contextTerms: string[];
  emphasizedTerms: string[];
  positionTitle: string;
  repeatedTerms: string[];
  requiredTerms: string[];
};

const aiMasterCvSchema = z.object({
  basics: z.object({
    full_name: z.string(),
    title: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    linkedin: z.string(),
    website: z.string()
  }),
  summary: z.string(),
  frontend_expertise: z.array(z.string()),
  hard_skills: z.array(z.string()),
  soft_skills: z.array(z.string()),
  technical_skills: z.object({
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    cms: z.array(z.string()),
    tools: z.array(z.string())
  }),
  work_experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      location: z.string(),
      engagement_type: z.enum(["", "full-time", "part-time", "project-based contract"]),
      start_date: z.string(),
      end_date: z.string(),
      current: z.boolean(),
      description: z.string(),
      hard_skills: z.array(z.string()),
      soft_skills: z.array(z.string()),
      programming_languages: z.array(z.string()),
      frameworks: z.array(z.string()),
      cms: z.array(z.string()),
      tools: z.array(z.string())
    })
  ),
  early_career: z.object({
    date_range: z.string(),
    summary: z.string()
  }),
  projects: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      client: z.string()
    })
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      location: z.string(),
      start_date: z.string(),
      end_date: z.string()
    })
  ),
  certifications: z.array(z.string()),
  languages: z.array(z.string()),
  hidden_context: z.object({
    additional_experience: z.array(z.string()),
    keywords: z.array(z.string())
  })
});

const aiCoverLetterSchema = z.object({
  cover_letter: z.string()
});

const roleAssessmentSchema = z.object({
  fitScore: z.number().int().min(1).max(10),
  decision: z.enum(["optimize", "optimize_with_caution", "reject"]),
  targetRole: z.string(),
  positioning: z.string(),
  mustIncludeKeywords: z.array(z.string()).default([]),
  missingRequirements: z.array(z.string()).default([]),
  riskNotes: z.array(z.string()).default([]),
  roleFamily: z.string().default(""),
  seniority: z.string().default(""),
  hardRequirements: z.array(z.string()).default([]),
  preferredRequirements: z.array(z.string()).default([]),
  atsKeywords: z.array(z.string()).default([])
});

const cvAuditSchema = z.object({
  atsAlignmentScore: z.number().int().min(1).max(10),
  credibilityScore: z.number().int().min(1).max(10),
  seniorityMatch: z.enum(["aligned", "overstated", "understated", "unclear"]),
  requiredFixes: z.array(z.string()).default([]),
  approvedForExport: z.boolean(),
  missingImportantKeywords: z.array(z.string()).default([]),
  unsupportedClaims: z.array(z.string()).default([]),
  genericBullets: z.array(z.string()).default([])
});

type OpenAIUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type RoleAssessorInput = {
  applicationContext?: Partial<ApplicationContext>;
  jobDetails?: string;
  masterCv: MasterCv;
  masterCvText: string;
  parsedJob: ParsedJob;
};

export type RoleAssessorOutput = z.infer<typeof roleAssessmentSchema>;

export type CvEditorInput = RoleAssessorInput & {
  assessment: RoleAssessorOutput;
  requiredFixes?: string[];
};

export type CvAuditorInput = {
  assessment: RoleAssessorOutput;
  jobDetails?: string;
  masterCv: MasterCv;
  masterCvText: string;
  optimizedCv: MasterCv;
  parsedJob: ParsedJob;
};

export type CvAuditorOutput = z.infer<typeof cvAuditSchema>;

export type OptimizationWorkflow = {
  assessor: RoleAssessorOutput;
  audits: CvAuditorOutput[];
  editorPasses: number;
  exportReady: boolean;
  status: WorkflowStatus;
};

export type OptimizationResult = {
  optimizedCvJson: MasterCv;
  coverLetterText: string;
  atsScore: number;
  exportReady: boolean;
  workflow: OptimizationWorkflow;
  metadata: {
    fallbackReason?: string;
    inputTokens: number;
    model: string;
    mode: "mock" | "openai";
    notes: string[];
    outputTokens: number;
    totalTokens: number;
  };
};

export async function optimizeApplication({
  assessmentOverride,
  applicationContext,
  coverLetterTemplate,
  jobDetails,
  masterCv,
  masterCvText,
  parsedJob
}: {
  assessmentOverride?: RoleAssessorOutput;
  applicationContext?: Partial<ApplicationContext>;
  coverLetterTemplate?: string;
  jobDetails?: string;
  masterCv: MasterCv;
  masterCvText: string;
  parsedJob: ParsedJob;
}): Promise<OptimizationResult> {
  if (openai) {
    try {
      return await optimizeWithOpenAI({
        assessmentOverride,
        applicationContext,
        coverLetterTemplate,
        jobDetails,
        masterCv,
        masterCvText,
        parsedJob
      });
    } catch (error) {
      return optimizeDeterministically({
        assessmentOverride,
        applicationContext,
        coverLetterTemplate,
        fallbackReason:
          error instanceof Error ? error.message : "Unknown OpenAI optimization error.",
        jobDetails,
        masterCv,
        masterCvText,
        parsedJob
      });
    }
  }

  return optimizeDeterministically({
    assessmentOverride,
    applicationContext,
    coverLetterTemplate,
    jobDetails,
    masterCv,
    masterCvText,
    parsedJob
  });
}

async function optimizeWithOpenAI({
  assessmentOverride,
  applicationContext,
  coverLetterTemplate,
  jobDetails,
  masterCv,
  masterCvText,
  parsedJob
}: {
  assessmentOverride?: RoleAssessorOutput;
  applicationContext?: Partial<ApplicationContext>;
  coverLetterTemplate?: string;
  jobDetails?: string;
  masterCv: MasterCv;
  masterCvText: string;
  parsedJob: ParsedJob;
}): Promise<OptimizationResult> {
  const contextText = applicationContextToText(applicationContext);
  const jobProfile = buildJobProfile({ contextText, jobDetails, parsedJob });
  const usage: OpenAIUsage[] = [];
  const assessment = assessmentOverride
    ? { result: normalizeRoleAssessment(assessmentOverride), usage: null }
    : await assessRoleWithOpenAI({
        applicationContext,
        jobDetails,
        masterCv,
        masterCvText,
        parsedJob
      });

  if (assessment.usage) {
    usage.push(assessment.usage);
  }

  if (!shouldGenerateCvForAssessment(assessment.result)) {
    return buildWorkflowExitResult({
      assessment: assessment.result,
      atsScore: scoreAtsCompatibility(masterCv, parsedJob).overall,
      coverLetterTemplate,
      masterCv,
      mode: "openai",
      notes: [
        assessmentOverride
          ? "Pre-generation assessment rejected optimization before CV generation."
          : "Role Assessor rejected optimization before CV generation.",
        `Assessed fit score: ${assessment.result.fitScore}/10.`,
        ...assessment.result.riskNotes
      ],
      parsedJob,
      status: "skipped_low_fit",
      usage
    });
  }

  const firstEditorPass = await editCvWithOpenAI({
    applicationContext,
    assessment: assessment.result,
    jobDetails,
    masterCv,
    masterCvText,
    parsedJob
  });
  usage.push(firstEditorPass.usage);

  const firstCv = prepareOptimizedCv({
    assessment: assessment.result,
    jobProfile,
    optimized: masterCvSchema.parse(firstEditorPass.result),
    source: masterCv
  });

  const firstAudit = await auditCvWithOpenAI({
    assessment: assessment.result,
    jobDetails,
    masterCv,
    masterCvText,
    optimizedCv: firstCv,
    parsedJob
  });
  usage.push(firstAudit.usage);

  const audits: CvAuditorOutput[] = [firstAudit.result];
  let finalCv = firstCv;
  let editorPasses = 1;

  if (!firstAudit.result.approvedForExport) {
    const secondEditorPass = await editCvWithOpenAI({
      applicationContext,
      assessment: assessment.result,
      jobDetails,
      masterCv,
      masterCvText,
      parsedJob,
      requiredFixes: firstAudit.result.requiredFixes
    });
    usage.push(secondEditorPass.usage);
    editorPasses = 2;

    finalCv = prepareOptimizedCv({
      assessment: assessment.result,
      jobProfile,
      optimized: masterCvSchema.parse(secondEditorPass.result),
      source: masterCv
    });

    const secondAudit = await auditCvWithOpenAI({
      assessment: assessment.result,
      jobDetails,
      masterCv,
      masterCvText,
      optimizedCv: finalCv,
      parsedJob
    });
    usage.push(secondAudit.usage);
    audits.push(secondAudit.result);
  }

  const status = workflowStatusForOutcome({
    assessment: assessment.result,
    audits
  });
  const exportReady = status === "approved";

  if (!exportReady) {
    return buildWorkflowExitResult({
      assessment: assessment.result,
      atsScore: scoreAtsCompatibility(masterCv, parsedJob).overall,
      audits,
      coverLetterTemplate,
      masterCv,
      mode: "openai",
      notes: [
        "CV Auditor rejected the optimized CV after one retry pass.",
        ...audits.flatMap((audit) => audit.requiredFixes)
      ],
      parsedJob,
      status,
      usage
    });
  }

  const score = scoreAtsCompatibility(finalCv, parsedJob);
  const draftCoverLetter = generateCoverLetter({
    applicationContext,
    masterCv: finalCv,
    parsedJob,
    template: coverLetterTemplate
  });
  const optimizedCoverLetter = await optimizeCoverLetterWithOpenAI({
    applicationContextText: contextText,
    draftCoverLetter,
    jobDetails,
    jobProfile,
    masterCv: finalCv,
    parsedJob
  });
  usage.push(optimizedCoverLetter.usage);

  return {
    optimizedCvJson: finalCv,
    coverLetterText: optimizedCoverLetter.coverLetterText,
    atsScore: score.overall,
    exportReady: true,
    workflow: {
      assessor: assessment.result,
      audits,
      editorPasses,
      exportReady: true,
      status
    },
    metadata: {
      ...sumUsage(usage),
      model: env.OPENAI_MODEL,
      mode: "openai",
      notes: [
        "Multi-agent workflow completed with Role Assessor, CV Editor, and CV Auditor.",
        `${assessmentOverride ? "Pre-generation assessment" : "Role Assessor"} decision: ${assessment.result.decision}.`,
        `CV Editor passes: ${editorPasses}.`,
        "Cover letter was generated from the final approved CV."
      ]
    }
  };
}

async function assessRoleWithOpenAI(
  input: RoleAssessorInput
): Promise<{ result: RoleAssessorOutput; usage: OpenAIUsage }> {
  const prompt = loadAgentPrompt("role-assessor.agent.md");
  const response = await openai!.responses.parse({
    input: [
      {
        role: "developer",
        content: prompt
      },
      {
        role: "user",
        content: JSON.stringify({
          application_context: applicationContextToText(input.applicationContext),
          master_cv_structured: input.masterCv,
          master_cv_text: input.masterCvText,
          parsed_job: input.parsedJob,
          raw_job_details: input.jobDetails ?? ""
        })
      }
    ],
    max_output_tokens: 5000,
    model: env.OPENAI_MODEL,
    text: {
      format: zodTextFormat(roleAssessmentSchema, "role_assessment")
    }
  });
  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("OpenAI returned no role assessment.");
  }

  return {
    result: normalizeRoleAssessment(parsed),
    usage: usageFromResponse(response)
  };
}

async function editCvWithOpenAI(
  input: CvEditorInput
): Promise<{ result: MasterCv; usage: OpenAIUsage }> {
  const prompt = loadAgentPrompt("cv-editor.agent.md");
  const response = await openai!.responses.parse({
    input: [
      {
        role: "developer",
        content: prompt
      },
      {
        role: "user",
        content: JSON.stringify({
          application_context: applicationContextToText(input.applicationContext),
          assessment: input.assessment,
          master_cv_structured: input.masterCv,
          master_cv_text: input.masterCvText,
          parsed_job: input.parsedJob,
          raw_job_details: input.jobDetails ?? "",
          required_fixes: input.requiredFixes ?? []
        })
      }
    ],
    max_output_tokens: 10000,
    model: env.OPENAI_MODEL,
    text: {
      format: zodTextFormat(aiMasterCvSchema, "optimized_master_cv")
    }
  });
  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("OpenAI returned no structured optimized CV.");
  }

  return {
    result: masterCvSchema.parse(parsed),
    usage: usageFromResponse(response)
  };
}

async function auditCvWithOpenAI(
  input: CvAuditorInput
): Promise<{ result: CvAuditorOutput; usage: OpenAIUsage }> {
  const prompt = loadAgentPrompt("cv-auditor.agent.md");
  const response = await openai!.responses.parse({
    input: [
      {
        role: "developer",
        content: prompt
      },
      {
        role: "user",
        content: JSON.stringify({
          assessment: input.assessment,
          master_cv_structured: input.masterCv,
          master_cv_text: input.masterCvText,
          optimized_cv_structured: input.optimizedCv,
          optimized_cv_text: coverLetterCvContext(input.optimizedCv),
          parsed_job: input.parsedJob,
          raw_job_details: input.jobDetails ?? ""
        })
      }
    ],
    max_output_tokens: 5000,
    model: env.OPENAI_MODEL,
    text: {
      format: zodTextFormat(cvAuditSchema, "cv_audit")
    }
  });
  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("OpenAI returned no CV audit.");
  }

  return {
    result: normalizeCvAudit(parsed),
    usage: usageFromResponse(response)
  };
}

async function optimizeCoverLetterWithOpenAI({
  applicationContextText,
  draftCoverLetter,
  jobDetails,
  jobProfile,
  masterCv,
  parsedJob
}: {
  applicationContextText: string;
  draftCoverLetter: string;
  jobDetails?: string;
  jobProfile: JobProfile;
  masterCv: MasterCv;
  parsedJob: ParsedJob;
}) {
  try {
    const response = await openai!.responses.parse({
      input: [
        {
          role: "developer",
          content: [
            "Rewrite the supplied cover letter draft for this exact application.",
            "Use only verified facts from the optimized CV, raw job details, and company context.",
            "Keep the applicant's contact details and factual background intact.",
            "Preserve the template's general structure and voice, but tailor the emphasis to the role and company.",
            "Preserve text-only formatting from the draft: salutation, paragraph breaks, blank lines, bullet/list blocks, and signature.",
            "If the draft has a project list or bullet list, keep it as a separate list block instead of merging it into a paragraph.",
            "Use newline characters for paragraph spacing. Do not return Markdown fences, HTML, tables, or rich-text markup.",
            "Mention company context only when it provides a specific, useful reason for interest.",
            "Use natural senior-level professional prose, not keyword stuffing or AI-sounding filler.",
            "Do not invent projects, metrics, employers, qualifications, certifications, citizenship, clearance, location, or availability.",
            "Return only the final cover letter text."
          ].join("\n")
        },
        {
          role: "user",
          content: JSON.stringify({
            application_context: applicationContextText,
            cover_letter_draft: draftCoverLetter,
            job: parsedJob,
            job_profile: jobProfile,
            optimized_cv_text: coverLetterCvContext(masterCv),
            raw_job_details: jobDetails ?? ""
          })
        }
      ],
      max_output_tokens: 3000,
      model: env.OPENAI_MODEL,
      text: {
        format: zodTextFormat(aiCoverLetterSchema, "optimized_cover_letter")
      }
    });

    return {
      coverLetterText: formatCoverLetterText(
        response.output_parsed?.cover_letter ?? draftCoverLetter
      ),
      usage: usageFromResponse(response)
    };
  } catch {
    return {
      coverLetterText: formatCoverLetterText(draftCoverLetter),
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    };
  }
}

function optimizeDeterministically({
  assessmentOverride,
  applicationContext,
  coverLetterTemplate,
  fallbackReason,
  jobDetails,
  masterCv,
  masterCvText,
  parsedJob
}: {
  assessmentOverride?: RoleAssessorOutput;
  applicationContext?: Partial<ApplicationContext>;
  coverLetterTemplate?: string;
  fallbackReason?: string;
  jobDetails?: string;
  masterCv: MasterCv;
  masterCvText: string;
  parsedJob: ParsedJob;
}): OptimizationResult {
  const contextText = applicationContextToText(applicationContext);
  const jobProfile = buildJobProfile({ contextText, jobDetails, parsedJob });
  const assessment = assessmentOverride
    ? normalizeRoleAssessment(assessmentOverride)
    : buildDeterministicRoleAssessment({
        applicationContext,
        jobDetails,
        masterCv,
        masterCvText,
        parsedJob
      });

  if (!shouldGenerateCvForAssessment(assessment)) {
    return buildWorkflowExitResult({
      assessment,
      atsScore: scoreAtsCompatibility(masterCv, parsedJob).overall,
      coverLetterTemplate,
      fallbackReason,
      masterCv,
      mode: "mock",
      notes: [
        assessmentOverride
          ? "Deterministic workflow respected the pre-generation assessment rejection."
          : "Deterministic Role Assessor rejected optimization before CV generation.",
        `Assessed fit score: ${assessment.fitScore}/10.`,
        ...assessment.riskNotes
      ],
      parsedJob,
      status: "skipped_low_fit"
    });
  }

  const firstCv = editCvDeterministically({
    assessment,
    jobProfile,
    masterCv,
    masterCvText,
    parsedJob
  });
  const firstAudit = auditCvDeterministically({
    assessment,
    masterCv,
    optimizedCv: firstCv,
    parsedJob
  });
  const audits = [firstAudit];
  let finalCv = firstCv;
  let editorPasses = 1;

  if (!firstAudit.approvedForExport) {
    finalCv = editCvDeterministically({
      assessment,
      jobProfile,
      masterCv,
      masterCvText,
      parsedJob,
      requiredFixes: firstAudit.requiredFixes
    });
    audits.push(
      auditCvDeterministically({
        assessment,
        masterCv,
        optimizedCv: finalCv,
        parsedJob
      })
    );
    editorPasses = 2;
  }

  const status = workflowStatusForOutcome({
    assessment,
    audits
  });

  if (status !== "approved") {
    return buildWorkflowExitResult({
      assessment,
      atsScore: scoreAtsCompatibility(masterCv, parsedJob).overall,
      audits,
      coverLetterTemplate,
      fallbackReason,
      masterCv,
      mode: "mock",
      notes: [
        "Deterministic CV Auditor rejected the optimized CV after one retry pass.",
        ...audits.flatMap((audit) => audit.requiredFixes)
      ],
      parsedJob,
      status
    });
  }

  const score = scoreAtsCompatibility(finalCv, parsedJob);
  const coverLetterText = generateCoverLetter({
    applicationContext,
    masterCv: finalCv,
    parsedJob,
    template: coverLetterTemplate
  });

  return {
    optimizedCvJson: finalCv,
    coverLetterText,
    atsScore: score.overall,
    exportReady: true,
    workflow: {
      assessor: assessment,
      audits,
      editorPasses,
      exportReady: true,
      status
    },
    metadata: {
      fallbackReason,
      inputTokens: 0,
      model: env.OPENAI_MODEL,
      mode: "mock",
      notes: [
        "Deterministic multi-agent workflow preserved the existing optimization fallback.",
        `${assessmentOverride ? "Pre-generation assessment" : "Role Assessor"} decision: ${assessment.decision}.`,
        `CV Editor passes: ${editorPasses}.`
      ],
      outputTokens: 0,
      totalTokens: 0
    }
  };
}

export function buildRoleAssessmentOverride(input: RoleAssessorInput): RoleAssessorOutput {
  return buildDeterministicRoleAssessment(input);
}

function buildDeterministicRoleAssessment({
  applicationContext,
  jobDetails,
  masterCv,
  masterCvText,
  parsedJob
}: RoleAssessorInput): RoleAssessorOutput {
  const fit = assessApplicationFit({
    applicationContext,
    masterCv,
    parsedJob
  });
  const atsKeywords = unique([
    ...parsedJob.required_skills,
    ...parsedJob.preferred_skills,
    ...parsedJob.keywords,
    ...extractRequirementPhrases(jobDetails ?? "", "required"),
    ...extractRequirementPhrases(jobDetails ?? "", "preferred")
  ]).slice(0, 18);
  const mustIncludeKeywords = atsKeywords
    .filter((keyword) => normalize(masterCvText).includes(normalize(keyword)))
    .slice(0, 12);
  const hardRequirements = unique([
    ...parsedJob.required_skills,
    ...extractRequirementPhrases(jobDetails ?? "", "required")
  ]).slice(0, 12);
  const preferredRequirements = unique([
    ...parsedJob.preferred_skills,
    ...extractRequirementPhrases(jobDetails ?? "", "preferred")
  ]).slice(0, 10);
  const fitScore = normalizeAgentScore(fit.fitScore);
  const decision = roleDecisionFromFitScore(fitScore);
  const targetRole = parsedJob.position_title?.trim() || masterCv.basics.title;

  return normalizeRoleAssessment({
    fitScore,
    decision,
    targetRole,
    positioning: buildPositioning({
      fitSummary: fit.summary,
      seniority: parsedJob.seniority,
      targetRole
    }),
    mustIncludeKeywords,
    missingRequirements: unique([...hardRequirements, ...fit.gaps]).filter(
      (keyword) => !normalize(masterCvText).includes(normalize(keyword))
    ),
    riskNotes: unique(fit.riskFlags),
    roleFamily: inferRoleFamily(parsedJob, jobDetails),
    seniority: parsedJob.seniority?.trim() || inferSeniority(jobDetails ?? "", targetRole),
    hardRequirements,
    preferredRequirements,
    atsKeywords
  });
}

function editCvDeterministically({
  assessment,
  jobProfile,
  masterCv,
  masterCvText,
  parsedJob,
  requiredFixes = []
}: {
  assessment: RoleAssessorOutput;
  jobProfile: JobProfile;
  masterCv: MasterCv;
  masterCvText: string;
  parsedJob: ParsedJob;
  requiredFixes?: string[];
}) {
  const relevantTerms = unique([
    ...matchedCvTerms(masterCvText, parsedJob, jobProfile),
    ...assessment.mustIncludeKeywords,
    ...requiredFixes.flatMap(splitPhraseTerms)
  ]);
  const relevantSkillSet = new Set(relevantTerms.map(normalize));
  const optimizedCvJson: MasterCv = {
    ...masterCv,
    basics: {
      ...masterCv.basics,
      title: optimizeTitle(masterCv, assessment)
    },
    frontend_expertise: filterByRelevance(masterCv.frontend_expertise, relevantSkillSet),
    hard_skills: sortByRelevance(
      unique([...masterCv.hard_skills, ...assessment.mustIncludeKeywords]),
      relevantSkillSet
    ),
    soft_skills: sortByRelevance(masterCv.soft_skills, relevantSkillSet),
    summary: optimizeSummary(masterCv, assessment, relevantTerms),
    technical_skills: {
      languages: sortByRelevance(masterCv.technical_skills.languages, relevantSkillSet),
      frameworks: sortByRelevance(masterCv.technical_skills.frameworks, relevantSkillSet),
      cms: sortByRelevance(masterCv.technical_skills.cms, relevantSkillSet),
      tools: sortByRelevance(masterCv.technical_skills.tools, relevantSkillSet)
    },
    work_experience: masterCv.work_experience.map((item) => ({
      ...item,
      description: rewriteWorkExperienceDescription(item, relevantTerms),
      hard_skills: sortByRelevance(item.hard_skills, relevantSkillSet),
      soft_skills: sortByRelevance(item.soft_skills, relevantSkillSet),
      programming_languages: sortByRelevance(item.programming_languages, relevantSkillSet),
      frameworks: sortByRelevance(item.frameworks, relevantSkillSet),
      cms: sortByRelevance(item.cms, relevantSkillSet),
      tools: sortByRelevance(item.tools, relevantSkillSet)
    })),
    projects: [...masterCv.projects].sort(
      (a, b) =>
        relevanceScore(projectText(b), relevantTerms) -
        relevanceScore(projectText(a), relevantTerms)
    ),
    hidden_context: {
      additional_experience: masterCv.hidden_context.additional_experience,
      keywords: sortByRelevance(
        unique([...masterCv.hidden_context.keywords, ...assessment.mustIncludeKeywords]),
        relevantSkillSet
      )
    }
  };

  return prepareOptimizedCv({
    assessment,
    jobProfile,
    optimized: optimizedCvJson,
    source: masterCv
  });
}

function auditCvDeterministically({
  assessment,
  masterCv,
  optimizedCv,
  parsedJob
}: {
  assessment: RoleAssessorOutput;
  masterCv: MasterCv;
  optimizedCv: MasterCv;
  parsedJob: ParsedJob;
}): CvAuditorOutput {
  const ats = normalizeAgentScore(scoreAtsCompatibility(optimizedCv, parsedJob).overall);
  const optimizedText = normalize(coverLetterCvContext(optimizedCv));
  const masterTerms = cvTermSet(masterCv);
  const unsupportedClaims = unique(
    [
      ...assessment.atsKeywords,
      ...assessment.hardRequirements,
      ...assessment.preferredRequirements
    ].filter((keyword) => {
      const normalized = normalize(keyword);

      return normalized && optimizedText.includes(normalized) && !masterTerms.has(normalized);
    })
  ).slice(0, 6);
  const missingImportantKeywords = assessment.mustIncludeKeywords.filter(
    (keyword) => !optimizedText.includes(normalize(keyword))
  );
  const genericBullets = optimizedCv.work_experience
    .map((item) => item.description.trim())
    .filter((description) => isGenericBullet(description, assessment.mustIncludeKeywords))
    .slice(0, 4);
  const seniorityMatch = determineSeniorityMatch(assessment, optimizedCv);
  const credibilityScore = normalizeAgentScore(
    10 -
      unsupportedClaims.length * 2 -
      missingImportantKeywords.length * 0.5 -
      (seniorityMatch === "overstated" ? 2 : 0)
  );
  const requiredFixes = unique([
    ...missingImportantKeywords.map((keyword) => `Add credible evidence for ${keyword}.`),
    ...unsupportedClaims.map(
      (claim) => `Remove or tone down unsupported emphasis on ${claim}.`
    ),
    ...(seniorityMatch === "overstated"
      ? ["Reduce the role positioning so it does not overstate seniority."]
      : []),
    ...(genericBullets.length > 0
      ? ["Replace generic experience language with evidence-backed accomplishments."]
      : [])
  ]).slice(0, 8);

  return normalizeCvAudit({
    atsAlignmentScore: ats,
    credibilityScore,
    seniorityMatch,
    requiredFixes,
    approvedForExport:
      ats >= 7 &&
      credibilityScore >= 8 &&
      seniorityMatch !== "overstated" &&
      requiredFixes.length === 0,
    missingImportantKeywords,
    unsupportedClaims,
    genericBullets
  });
}

function prepareOptimizedCv({
  assessment,
  jobProfile,
  optimized,
  source
}: {
  assessment: RoleAssessorOutput;
  jobProfile: JobProfile;
  optimized: MasterCv;
  source: MasterCv;
}) {
  return applyEarlyCareerGrouping({
    optimized: applyGenericEnhancements(
      preserveDbFacts(source, optimized, assessment),
      jobProfile
    ),
    source
  });
}

function preserveDbFacts(
  source: MasterCv,
  optimized: MasterCv,
  assessment?: RoleAssessorOutput
): MasterCv {
  return masterCvSchema.parse({
    ...optimized,
    basics: {
      ...source.basics,
      title: optimized.basics.title || assessment?.targetRole || source.basics.title
    },
    work_experience: source.work_experience.map((sourceItem, index) => {
      const optimizedItem = optimized.work_experience[index] ?? sourceItem;

      return {
        ...optimizedItem,
        company: sourceItem.company,
        current: sourceItem.current,
        end_date: sourceItem.end_date,
        engagement_type: sourceItem.engagement_type,
        location: sourceItem.location,
        start_date: sourceItem.start_date,
        title: sourceItem.title
      };
    }),
    projects: source.projects.map((sourceProject, index) => {
      const optimizedProject = optimized.projects[index] ?? sourceProject;

      return {
        ...optimizedProject,
        client: sourceProject.client,
        title: sourceProject.title
      };
    }),
    education: source.education,
    certifications: source.certifications,
    languages: source.languages
  });
}

function buildWorkflowExitResult({
  assessment,
  atsScore,
  audits = [],
  coverLetterTemplate,
  fallbackReason,
  masterCv,
  mode,
  notes,
  parsedJob,
  status,
  usage = []
}: {
  assessment: RoleAssessorOutput;
  atsScore: number;
  audits?: CvAuditorOutput[];
  coverLetterTemplate?: string;
  fallbackReason?: string;
  masterCv: MasterCv;
  mode: "mock" | "openai";
  notes: string[];
  parsedJob: ParsedJob;
  status: WorkflowStatus;
  usage?: OpenAIUsage[];
}) {
  return {
    optimizedCvJson: masterCv,
    coverLetterText: generateCoverLetter({
      masterCv,
      parsedJob,
      template: coverLetterTemplate
    }),
    atsScore,
    exportReady: false,
    workflow: {
      assessor: assessment,
      audits,
      editorPasses: audits.length > 1 ? 2 : 0,
      exportReady: false,
      status
    },
    metadata: {
      ...sumUsage(usage),
      fallbackReason,
      model: env.OPENAI_MODEL,
      mode,
      notes
    }
  };
}

function normalizeRoleAssessment(
  value: z.infer<typeof roleAssessmentSchema>
): RoleAssessorOutput {
  const fitScore = normalizeAgentScore(value.fitScore);

  return {
    ...value,
    fitScore,
    decision: roleDecisionFromFitScore(fitScore),
    targetRole: value.targetRole.trim(),
    positioning: polishResumeProse(value.positioning),
    mustIncludeKeywords: unique(value.mustIncludeKeywords).slice(0, 12),
    missingRequirements: unique(value.missingRequirements).slice(0, 12),
    riskNotes: unique(value.riskNotes).slice(0, 8),
    roleFamily: value.roleFamily.trim(),
    seniority: value.seniority.trim(),
    hardRequirements: unique(value.hardRequirements).slice(0, 12),
    preferredRequirements: unique(value.preferredRequirements).slice(0, 10),
    atsKeywords: unique(value.atsKeywords).slice(0, 18)
  };
}

function normalizeCvAudit(value: z.infer<typeof cvAuditSchema>): CvAuditorOutput {
  const atsAlignmentScore = normalizeAgentScore(value.atsAlignmentScore);
  const credibilityScore = normalizeAgentScore(value.credibilityScore);
  const seniorityMatch = value.seniorityMatch;
  const requiredFixes = unique(value.requiredFixes).slice(0, 8);
  const missingImportantKeywords = unique(value.missingImportantKeywords).slice(0, 8);
  const unsupportedClaims = unique(value.unsupportedClaims).slice(0, 8);
  const genericBullets = unique(value.genericBullets).slice(0, 6);

  return {
    atsAlignmentScore,
    credibilityScore,
    seniorityMatch,
    requiredFixes,
    approvedForExport:
      value.approvedForExport &&
      atsAlignmentScore >= 7 &&
      credibilityScore >= 7 &&
      seniorityMatch !== "overstated",
    missingImportantKeywords,
    unsupportedClaims,
    genericBullets
  };
}

function loadAgentPrompt(fileName: string) {
  const filePath = path.join(process.cwd(), "agents", fileName);

  return readFileSync(filePath, "utf8");
}

function usageFromResponse(response: {
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}) {
  return {
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0
  };
}

function sumUsage(usage: OpenAIUsage[]) {
  return usage.reduce(
    (totals, current) => ({
      inputTokens: totals.inputTokens + current.inputTokens,
      outputTokens: totals.outputTokens + current.outputTokens,
      totalTokens: totals.totalTokens + current.totalTokens
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
  );
}

function buildPositioning({
  fitSummary,
  seniority,
  targetRole
}: {
  fitSummary: string;
  seniority?: string | null;
  targetRole: string;
}) {
  const prefix = seniority ? `${seniority} ${targetRole}`.trim() : targetRole;

  return polishResumeProse(`${prefix} positioning: ${fitSummary}`);
}

function inferRoleFamily(parsedJob: ParsedJob, jobDetails?: string) {
  const text = normalize(
    [parsedJob.position_title ?? "", ...parsedJob.required_skills, jobDetails ?? ""].join(" ")
  );

  if (/frontend|react|next|ui|web/.test(text)) {
    return "Frontend Engineering";
  }

  if (/full stack|fullstack|node|api|backend|graphql/.test(text)) {
    return "Full Stack Engineering";
  }

  if (/drupal|cms|content/.test(text)) {
    return "CMS Engineering";
  }

  return "Software Engineering";
}

function inferSeniority(jobDetails: string, targetRole: string) {
  const text = normalize([jobDetails, targetRole].join(" "));

  if (/principal|staff/.test(text)) {
    return "staff";
  }

  if (/lead/.test(text)) {
    return "lead";
  }

  if (/senior/.test(text)) {
    return "senior";
  }

  if (/junior/.test(text)) {
    return "junior";
  }

  return "mid";
}

function determineSeniorityMatch(
  assessment: RoleAssessorOutput,
  optimizedCv: MasterCv
): CvAuditorOutput["seniorityMatch"] {
  const seniority = normalize(assessment.seniority);
  const cvText = normalize(
    [
      optimizedCv.basics.title,
      optimizedCv.summary,
      ...optimizedCv.work_experience.map((item) => item.title)
    ].join(" ")
  );

  if (!seniority) {
    return "unclear";
  }

  if (/staff|principal/.test(seniority) && !/staff|principal|lead/.test(cvText)) {
    return "understated";
  }

  if (/senior/.test(seniority) && !/senior|lead|staff|principal/.test(cvText)) {
    return "understated";
  }

  if (/lead|staff|principal/.test(cvText) && /junior|mid/.test(seniority)) {
    return "overstated";
  }

  return "aligned";
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
      .flatMap(splitPhraseTerms)
      .map(normalize)
      .filter(Boolean)
  );
}

function extractRequirementPhrases(value: string, mode: "required" | "preferred") {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const matcher =
    mode === "required"
      ? /(require|must|minimum|qualification|experience with)/i
      : /(prefer|nice to have|bonus|plus)/i;

  return lines.filter((line) => matcher.test(line)).slice(0, 10);
}

function optimizeTitle(masterCv: MasterCv, assessment: RoleAssessorOutput) {
  const targetRole = assessment.targetRole.trim();

  if (!targetRole) {
    return masterCv.basics.title;
  }

  return targetRole;
}

function rewriteWorkExperienceDescription(
  item: MasterCv["work_experience"][number],
  relevantTerms: string[]
) {
  const polished = polishResumeProse(item.description);
  const relevantSkills = unique(
    [
      ...item.hard_skills,
      ...item.soft_skills,
      ...item.programming_languages,
      ...item.frameworks,
      ...item.cms,
      ...item.tools
    ].filter((skill) =>
      relevantTerms.some((term) => hasRelevantOverlap(normalize(skill), new Set([normalize(term)])))
    )
  ).slice(0, 5);

  if (!relevantSkills.length || /selected technologies:/i.test(polished)) {
    return polished;
  }

  return [polished, `Selected technologies: ${relevantSkills.join(", ")}.`]
    .filter(Boolean)
    .join("\n");
}

function isGenericBullet(description: string, keywords: string[]) {
  const normalized = normalize(description);

  if (!normalized) {
    return true;
  }

  const genericPatterns = [
    "worked on",
    "responsible for",
    "helped with",
    "supported",
    "participated in"
  ];

  return (
    description.length < 90 ||
    genericPatterns.some((pattern) => normalized.includes(pattern)) ||
    keywords.every((keyword) => !normalized.includes(normalize(keyword)))
  );
}

function applyGenericEnhancements(masterCv: MasterCv, jobProfile: JobProfile) {
  const profileTerms = new Set(jobProfile.emphasizedTerms.map(normalize));

  return masterCvSchema.parse({
    ...masterCv,
    summary: polishResumeProse(masterCv.summary),
    frontend_expertise: filterByRelevance(
      normalizeSkillNames(masterCv.frontend_expertise),
      profileTerms
    ),
    hard_skills: normalizeSkillNames(masterCv.hard_skills),
    technical_skills: {
      languages: sortByRelevance(
        normalizeSkillNames(masterCv.technical_skills.languages),
        profileTerms
      ),
      frameworks: sortByRelevance(
        normalizeSkillNames(masterCv.technical_skills.frameworks),
        profileTerms
      ),
      cms: sortByRelevance(normalizeSkillNames(masterCv.technical_skills.cms), profileTerms),
      tools: sortByRelevance(
        normalizeSkillNames(masterCv.technical_skills.tools),
        profileTerms
      )
    },
    work_experience: masterCv.work_experience.map((item) => ({
      ...item,
      description: polishResumeProse(item.description),
      hard_skills: normalizeSkillNames(item.hard_skills),
      soft_skills: normalizeSkillNames(item.soft_skills),
      programming_languages: normalizeSkillNames(item.programming_languages),
      frameworks: normalizeSkillNames(item.frameworks),
      cms: normalizeSkillNames(item.cms),
      tools: normalizeSkillNames(item.tools)
    })),
    early_career: {
      date_range: polishResumeProse(masterCv.early_career.date_range),
      summary: polishResumeProse(masterCv.early_career.summary)
    },
    projects: masterCv.projects.map((project) => ({
      ...project,
      description: polishResumeProse(project.description)
    })),
    hidden_context: {
      additional_experience: masterCv.hidden_context.additional_experience,
      keywords: sortByRelevance(
        unique([...masterCv.hidden_context.keywords, ...jobProfile.emphasizedTerms]),
        profileTerms
      )
    },
    languages: selectRelevantLanguages(masterCv.languages, jobProfile)
  });
}

function applyEarlyCareerGrouping({
  optimized,
  source
}: {
  optimized: MasterCv;
  source: MasterCv;
}) {
  const earlyItems =
    source.work_experience.length >= 6 ? source.work_experience.slice(-4) : [];

  if (earlyItems.length < 2) {
    return masterCvSchema.parse({
      ...optimized,
      early_career: {
        date_range: "",
        summary: ""
      }
    });
  }

  const earlyIndexes = new Set(
    source.work_experience
      .map((_item, index) => index)
      .slice(-earlyItems.length)
  );
  const visibleItems = source.work_experience
    .map((sourceItem, index) => {
      const optimizedItem = optimized.work_experience[index] ?? sourceItem;

      return {
        ...optimizedItem,
        company: sourceItem.company,
        current: sourceItem.current,
        end_date: sourceItem.end_date,
        engagement_type: sourceItem.engagement_type,
        location: sourceItem.location,
        start_date: sourceItem.start_date,
        title: sourceItem.title
      };
    })
    .filter((_item, index) => !earlyIndexes.has(index));
  const earlySkills = unique(
    earlyItems.flatMap((item) => [
      ...item.hard_skills,
      ...item.soft_skills,
      ...item.programming_languages,
      ...item.frameworks,
      ...item.cms,
      ...item.tools
    ])
  ).slice(0, 10);
  const dateRange = earlyCareerDateRange(earlyItems);
  const summaryParts = [
    `Earlier experience includes ${earlyItems.length} roles`,
    earlySkills.length ? `covering ${earlySkills.join(", ")}` : ""
  ].filter(Boolean);

  return masterCvSchema.parse({
    ...optimized,
    work_experience: visibleItems,
    early_career: {
      date_range: dateRange,
      summary: `${summaryParts.join(" ")}.`
    }
  });
}

function earlyCareerDateRange(items: MasterCv["work_experience"]) {
  const startDates = items.map((item) => item.start_date).filter(Boolean).sort();
  const endDates = items
    .map((item) => (item.current ? "Present" : item.end_date))
    .filter(Boolean)
    .sort();
  const start = startDates[0] ?? "";
  const end = endDates.includes("Present") ? "Present" : endDates.at(-1) ?? "";

  return [start, end].filter(Boolean).join(" to ");
}

function buildJobProfile({
  contextText,
  jobDetails,
  parsedJob
}: {
  contextText?: string;
  jobDetails?: string;
  parsedJob: ParsedJob;
}): JobProfile {
  const requiredTerms = unique([
    ...parsedJob.required_skills,
    ...parsedJob.preferred_skills
  ]);
  const parsedTerms = unique([
    ...requiredTerms,
    ...parsedJob.keywords,
    ...parsedJob.responsibilities.flatMap(splitPhraseTerms),
    ...splitPhraseTerms(parsedJob.position_title ?? ""),
    ...splitPhraseTerms(parsedJob.seniority ?? "")
  ]);
  const repeatedTerms = extractRepeatedTerms([jobDetails ?? "", contextText ?? ""].join("\n"));
  const contextTerms = extractRepeatedTerms(contextText ?? "").slice(0, 20);
  const emphasizedTerms = unique([
    ...requiredTerms,
    ...repeatedTerms,
    ...parsedTerms
  ]).slice(0, 40);

  return {
    contextTerms,
    emphasizedTerms,
    positionTitle: parsedJob.position_title ?? "",
    repeatedTerms,
    requiredTerms
  };
}

function normalizeSkillNames(items: string[]) {
  return items.map((item) =>
    item
      .replace(/\bNextJS\b/g, "Next.js")
      .replace(/\bNextjs\b/g, "Next.js")
      .replace(/\bReactJS\b/g, "React.js")
      .replace(/\bReactjs\b/g, "React.js")
      .replace(/\bTailwindCSS\b/g, "Tailwind CSS")
  );
}

function polishResumeProse(value: string) {
  return value
    .replace(/\s*→\s*/g, " to ")
    .replace(/\s*->\s*/g, " to ")
    .replace(/\b([A-Za-z0-9.+#]+)\s*\/\s*([A-Za-z0-9.+#]+)\b/g, "$1 and $2")
    .replace(/\bLeveraged\b/g, "Used")
    .replace(/\bleveraged\b/g, "used")
    .replace(/\bRobust\b/g, "Reliable")
    .replace(/\brobust\b/g, "reliable")
    .replace(/\bDynamic\b/g, "Fast-moving")
    .replace(/\bdynamic\b/g, "fast-moving")
    .replace(/\bcutting-edge\b/gi, "modern")
    .replace(/\bseasoned professional\b/gi, "senior professional")
    .replace(/\bpassionate\b/gi, "focused")
    .replace(/\bproven track record of\b/gi, "experience")
    .replace(/\bresults-driven\b/gi, "delivery-focused")
    .replace(/\s{2,}/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .trim();
}

function formatCoverLetterText(value: string) {
  return polishResumeProse(value)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(Dear [^\n,]+,)\s+/g, "$1\n\n")
    .replace(/(:)\s+-\s+/g, "$1\n\n- ")
    .replace(/\s+(-\s+[A-Z0-9])/g, "\n$1")
    .replace(
      /\s+(Over the years,|More recently,|These experiences|I(?:'|’)m fluent|I am fluent|You can reach me|Thank you for your time|Regards,|Sincerely,)/g,
      "\n\n$1"
    )
    .replace(/(\n-\s[^\n]+)\s+(-\s)/g, "$1\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function selectRelevantLanguages(languages: string[], jobProfile: JobProfile) {
  const jobText = normalize(jobProfile.emphasizedTerms.join(" "));
  const mentioned = languages.filter((language) => {
    const name = normalize(language).split(" ")[0] ?? "";

    return name && jobText.includes(name);
  });
  const english = languages.find((language) => /\benglish\b/i.test(language));

  return unique([...(english ? [english] : []), ...mentioned]).slice(0, 2);
}

function optimizeSummary(
  masterCv: MasterCv,
  assessment: RoleAssessorOutput,
  relevantTerms: string[]
) {
  const role = assessment.targetRole || "this role";
  const topTerms = unique([
    ...assessment.mustIncludeKeywords,
    ...relevantTerms
  ]).slice(0, 6);
  const baseSummary = polishResumeProse(masterCv.summary);
  const positioning = assessment.positioning.trim();
  const keywordSentence = topTerms.length
    ? `Relevant strengths for ${role} include ${topTerms.join(", ")}.`
    : "";

  return [baseSummary, positioning, keywordSentence]
    .map(polishResumeProse)
    .filter(Boolean)
    .join("\n\n");
}

function matchedCvTerms(
  masterCvText: string,
  parsedJob: ParsedJob,
  jobProfile: JobProfile
) {
  const cvText = normalize(masterCvText);
  const terms = unique([
    ...jobProfile.emphasizedTerms,
    ...parsedJob.required_skills,
    ...parsedJob.preferred_skills,
    ...parsedJob.keywords,
    ...splitTerm(parsedJob.position_title ?? ""),
    ...splitTerm(parsedJob.seniority ?? "")
  ]);

  return terms.filter((term) => cvText.includes(normalize(term))).slice(0, 40);
}

function filterByRelevance(items: string[], relevantTerms: Set<string>) {
  if (relevantTerms.size === 0) {
    return [];
  }

  return items.filter((item) => {
    const itemTerms = splitPhraseTerms(item).map(normalize);

    return itemTerms.some((term) => hasRelevantOverlap(term, relevantTerms));
  });
}

function sortByRelevance(items: string[], relevantTerms: Set<string>) {
  return [...items].sort((a, b) => {
    const aRelevant = hasRelevantOverlap(normalize(a), relevantTerms) ? 0 : 1;
    const bRelevant = hasRelevantOverlap(normalize(b), relevantTerms) ? 0 : 1;

    return aRelevant - bRelevant || a.localeCompare(b);
  });
}

function hasRelevantOverlap(value: string, relevantTerms: Set<string>) {
  if (!value) {
    return false;
  }

  return [...relevantTerms].some(
    (term) => term && (value.includes(term) || term.includes(value))
  );
}

function relevanceScore(text: string, terms: string[]) {
  const normalizedText = normalize(text);

  return terms.reduce(
    (score, term) => score + (normalizedText.includes(normalize(term)) ? 1 : 0),
    0
  );
}

function projectText(item: MasterCv["projects"][number]) {
  return [item.title, item.client, item.description].join(" ");
}

function coverLetterCvContext(masterCv: MasterCv) {
  return [
    masterCv.basics.full_name,
    masterCv.basics.title,
    masterCv.summary,
    masterCv.hard_skills.length ? `Hard skills: ${masterCv.hard_skills.join(", ")}` : "",
    masterCv.technical_skills.languages.length
      ? `Programming languages: ${masterCv.technical_skills.languages.join(", ")}`
      : "",
    masterCv.technical_skills.frameworks.length
      ? `Frameworks: ${masterCv.technical_skills.frameworks.join(", ")}`
      : "",
    masterCv.technical_skills.cms.length
      ? `CMS / platforms: ${masterCv.technical_skills.cms.join(", ")}`
      : "",
    masterCv.projects.length
      ? `Projects: ${masterCv.projects
          .map((project) =>
            [project.title, project.client, project.description].filter(Boolean).join(" - ")
          )
          .join("\n")}`
      : "",
    masterCv.work_experience.length
      ? `Recent experience: ${masterCv.work_experience
          .slice(0, 5)
          .map((item) =>
            [item.title, item.company, item.description].filter(Boolean).join(" - ")
          )
          .join("\n")}`
      : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function splitTerm(value: string) {
  return value
    .split(/\s|,|\/|\||-/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);
}

function splitPhraseTerms(value: string) {
  return value
    .split(/,|\n|;|\||\/|•|-|\(|\)/)
    .flatMap((part) => {
      const trimmed = part.trim();
      const words = trimmed.split(/\s+/).filter(Boolean);

      if (words.length <= 4) {
        return [trimmed, ...words];
      }

      return words;
    })
    .map((term) => term.trim())
    .filter((term) => term.length > 2 && !stopWords.has(normalize(term)));
}

function extractRepeatedTerms(value: string) {
  const counts = new Map<string, { label: string; count: number }>();

  for (const term of splitPhraseTerms(value)) {
    const normalized = normalize(term);

    if (!normalized || stopWords.has(normalized)) {
      continue;
    }

    const current = counts.get(normalized);
    counts.set(normalized, {
      label: current?.label ?? term,
      count: (current?.count ?? 0) + 1
    });
  }

  return [...counts.values()]
    .filter((item) => item.count > 1 || /[A-Z0-9+#.]/.test(item.label))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((item) => item.label)
    .slice(0, 40);
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

const stopWords = new Set([
  "able",
  "about",
  "according",
  "across",
  "additional",
  "all",
  "also",
  "and",
  "any",
  "application",
  "are",
  "benefits",
  "candidate",
  "candidates",
  "company",
  "complex",
  "concepts",
  "day",
  "deliver",
  "delivered",
  "details",
  "different",
  "dynamic",
  "each",
  "eligible",
  "environment",
  "experience",
  "field",
  "for",
  "from",
  "full",
  "have",
  "including",
  "job",
  "knowledgeable",
  "multiple",
  "must",
  "opening",
  "opportunity",
  "other",
  "position",
  "preferred",
  "project",
  "projects",
  "provided",
  "required",
  "requirements",
  "responsible",
  "role",
  "skills",
  "strong",
  "team",
  "technical",
  "the",
  "this",
  "through",
  "using",
  "with",
  "work",
  "working",
  "years",
  "your"
]);
