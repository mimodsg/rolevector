import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { MasterCv } from "@/lib/schemas/master-cv";
import type { ParsedJob } from "@/lib/schemas/job";
import { env } from "@/lib/env";
import { masterCvSchema } from "@/lib/schemas/master-cv";
import {
  applicationContextToText,
  type ApplicationContext
} from "./application-context";
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

export type OptimizationResult = {
  optimizedCvJson: MasterCv;
  coverLetterText: string;
  atsScore: number;
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
  applicationContext,
  coverLetterTemplate,
  jobDetails,
  masterCv,
  masterCvText,
  parsedJob
}: {
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
        applicationContext,
        coverLetterTemplate,
        jobDetails,
        masterCv,
        masterCvText,
        parsedJob
      });
    } catch (error) {
      return optimizeDeterministically({
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
    applicationContext,
    coverLetterTemplate,
    jobDetails,
    masterCv,
    masterCvText,
    parsedJob
  });
}

async function optimizeWithOpenAI({
  applicationContext,
  coverLetterTemplate,
  jobDetails,
  masterCv,
  masterCvText,
  parsedJob
}: {
  applicationContext?: Partial<ApplicationContext>;
  coverLetterTemplate?: string;
  jobDetails?: string;
  masterCv: MasterCv;
  masterCvText: string;
  parsedJob: ParsedJob;
}): Promise<OptimizationResult> {
  const contextText = applicationContextToText(applicationContext);
  const jobProfile = buildJobProfile({ contextText, jobDetails, parsedJob });
  const response = await openai!.responses.parse({
    input: [
      {
        role: "developer",
        content: [
          "You optimize CV content for applicant tracking systems using only verified facts from the supplied Master CV.",
          "Return one complete Master CV object matching the requested schema.",
          "Preserve identity, contact details, employers, titles, dates, education, certifications, languages, and project/client facts.",
          "Do not invent skills, companies, dates, degrees, certifications, metrics, clients, or responsibilities.",
          "Use the full raw job details as the source of truth for role targeting, keyword emphasis, summary language, and section ordering.",
          "Use the supplied company and job page context to tune emphasis and cover letter relevance, but do not invent facts from that context.",
          "Infer the role positioning from the specific application data. Do not assume a predefined role family, specialty, or technology focus.",
          "The Professional Summary must lead with the target role and the strongest repeated or explicitly required requirements from the raw job details.",
          "Write like a senior human resume writer, not like a keyword generator. Use natural, concise accomplishment language with active verbs.",
          "Preserve ATS terms, but integrate them into readable phrases instead of dumping symbol-heavy keyword strings into prose.",
          "Avoid AI-sounding filler such as leverages, robust, dynamic, cutting-edge, seasoned professional, passionate, proven track record, and results-driven unless already present in the Master CV.",
          "Avoid shorthand transitions such as arrows, excessive slashes, parenthetical keyword stacks, and repeated buzzword lists in summaries or bullets.",
          "Dedicated sections should be populated only when their topic is clearly relevant to this job. Leave a dedicated section empty when it would skew the CV away from the posting.",
          "Normalize NextJS to Next.js wherever it appears.",
          "Do not let Early Career include recent roles. The application will group the oldest four experience entries into early_career when enough entries exist.",
          "Keep output ATS-friendly: plain text descriptions, standard section-ready content, direct keyword alignment, no tables, no decorative markup.",
          "If the job requests a skill that is not supported by the Master CV, do not add it as experience."
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify({
          job: parsedJob,
          job_profile: jobProfile,
          raw_job_details: jobDetails ?? "",
          application_context: contextText,
          master_cv_text: masterCvText,
          master_cv_structured: masterCv
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

  const optimizedCvJson = applyEarlyCareerGrouping({
    optimized: applyGenericEnhancements(
      preserveDbFacts(masterCv, masterCvSchema.parse(parsed)),
      jobProfile
    ),
    source: masterCv
  });
  const score = scoreAtsCompatibility(optimizedCvJson, parsedJob);
  const draftCoverLetter = generateCoverLetter({
    applicationContext,
    masterCv: optimizedCvJson,
    parsedJob,
    template: coverLetterTemplate
  });
  const optimizedCoverLetter = await optimizeCoverLetterWithOpenAI({
    applicationContextText: contextText,
    draftCoverLetter,
    jobDetails,
    jobProfile,
    masterCv: optimizedCvJson,
    parsedJob
  });

  return {
    optimizedCvJson,
    coverLetterText: optimizedCoverLetter.coverLetterText,
    atsScore: score.overall,
    metadata: {
      inputTokens:
        (response.usage?.input_tokens ?? 0) + optimizedCoverLetter.inputTokens,
      model: env.OPENAI_MODEL,
      mode: "openai",
      notes: [
        "OpenAI structured output optimized the CV from DB-backed Master CV facts.",
        `Master CV source serialized to ${masterCvText.length} characters before optimization.`,
        "Output was validated against the Master CV application schema before saving.",
        "Immutable source facts were restored from the DB-backed Master CV before persistence.",
        `Derived ${jobProfile.emphasizedTerms.length} emphasized terms from the job details.`,
        "Cover letter was rewritten against the optimized CV, raw job details, and company context.",
        ...(contextText
          ? ["Company and job page context was included as secondary optimization context."]
          : [])
      ],
      outputTokens:
        (response.usage?.output_tokens ?? 0) + optimizedCoverLetter.outputTokens,
      totalTokens:
        (response.usage?.total_tokens ?? 0) + optimizedCoverLetter.totalTokens
    }
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
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0
    };
  } catch {
    return {
      coverLetterText: formatCoverLetterText(draftCoverLetter),
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    };
  }
}

function optimizeDeterministically({
  applicationContext,
  coverLetterTemplate,
  fallbackReason,
  jobDetails,
  masterCv,
  masterCvText,
  parsedJob
}: {
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
  const relevantTerms = matchedCvTerms(masterCvText, parsedJob, jobProfile);
  const relevantSkillSet = new Set(relevantTerms.map(normalize));

  const optimizedCvJson: MasterCv = {
    ...masterCv,
    frontend_expertise: filterByRelevance(masterCv.frontend_expertise, relevantSkillSet),
    hard_skills: sortByRelevance(masterCv.hard_skills, relevantSkillSet),
    soft_skills: sortByRelevance(masterCv.soft_skills, relevantSkillSet),
    summary: optimizeSummary(masterCv, parsedJob, relevantTerms),
    technical_skills: {
      languages: sortByRelevance(masterCv.technical_skills.languages, relevantSkillSet),
      frameworks: sortByRelevance(masterCv.technical_skills.frameworks, relevantSkillSet),
      cms: sortByRelevance(masterCv.technical_skills.cms, relevantSkillSet),
      tools: sortByRelevance(masterCv.technical_skills.tools, relevantSkillSet)
    },
    work_experience: [...masterCv.work_experience]
      .map((item) => ({
        ...item,
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
        unique([...masterCv.hidden_context.keywords, ...relevantTerms]),
        relevantSkillSet
      )
    }
  };
  const groupedOptimizedCvJson = applyEarlyCareerGrouping({
    optimized: applyGenericEnhancements(optimizedCvJson, jobProfile),
    source: masterCv
  });
  const score = scoreAtsCompatibility(groupedOptimizedCvJson, parsedJob);

  const coverLetterText = generateCoverLetter({
    applicationContext,
    masterCv: groupedOptimizedCvJson,
    parsedJob,
    template: coverLetterTemplate
  });

  return {
    optimizedCvJson: groupedOptimizedCvJson,
    coverLetterText,
    atsScore: score.overall,
    metadata: {
      fallbackReason,
      inputTokens: 0,
      model: env.OPENAI_MODEL,
      mode: "mock",
      notes: [
        "Deterministic ATS pass preserves factual Master CV data.",
        `Master CV source serialized to ${masterCvText.length} characters before optimization.`,
        `Matched ${relevantTerms.length} job terms already present in the application CV.`,
        "Skills, work experience, projects, and summary emphasis were reordered for job relevance.",
        `Derived ${jobProfile.emphasizedTerms.length} emphasized terms from the job details.`,
        ...(contextText
          ? ["Company and job page context was included as secondary tailoring context."]
          : []),
        ...(fallbackReason ? [`OpenAI fallback reason: ${fallbackReason}`] : [])
      ],
      outputTokens: 0,
      totalTokens: 0
    }
  };
}

function preserveDbFacts(source: MasterCv, optimized: MasterCv): MasterCv {
  return masterCvSchema.parse({
    ...optimized,
    basics: source.basics,
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

function optimizeSummary(masterCv: MasterCv, parsedJob: ParsedJob, relevantTerms: string[]) {
  const role = parsedJob.position_title ?? "this role";
  const topTerms = relevantTerms.slice(0, 6).join(", ");
  const baseSummary = polishResumeProse(masterCv.summary);

  if (!topTerms) {
    return baseSummary;
  }

  const alignmentSentence = polishResumeProse(
    `Relevant strengths for ${role} include ${topTerms}.`
  );

  if (!baseSummary) {
    return alignmentSentence;
  }

  if (baseSummary.includes(alignmentSentence)) {
    return baseSummary;
  }

  return `${baseSummary}\n\n${alignmentSentence}`;
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
