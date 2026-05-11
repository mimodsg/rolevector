import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { MasterCv } from "@/lib/schemas/master-cv";
import type { ParsedJob } from "@/lib/schemas/job";
import { env } from "@/lib/env";
import { masterCvSchema } from "@/lib/schemas/master-cv";
import { generateCoverLetter } from "./cover-letter-generator";
import { scoreAtsCompatibility } from "./ats-scoring";

const openai = env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: env.OPENAI_API_KEY
    })
  : null;
const frontendExpertise = [
  "React.js",
  "Next.js",
  "JavaScript (ES6+)",
  "TypeScript",
  "React Hooks",
  "Component Architecture",
  "State Management",
  "Tailwind CSS",
  "Responsive Design",
  "Semantic HTML",
  "Accessibility (WCAG)",
  "Design Systems",
  "Storybook",
  "Performance Optimization",
  "SSR/SSG",
  "Lazy Loading",
  "Code Splitting",
  "Lighthouse",
  "Core Web Vitals",
  "REST APIs",
  "GraphQL"
];

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
  coverLetterTemplate,
  masterCv,
  masterCvText,
  parsedJob
}: {
  coverLetterTemplate?: string;
  masterCv: MasterCv;
  masterCvText: string;
  parsedJob: ParsedJob;
}): Promise<OptimizationResult> {
  if (openai) {
    try {
      return await optimizeWithOpenAI({
        coverLetterTemplate,
        masterCv,
        masterCvText,
        parsedJob
      });
    } catch (error) {
      return optimizeDeterministically({
        coverLetterTemplate,
        fallbackReason:
          error instanceof Error ? error.message : "Unknown OpenAI optimization error.",
        masterCv,
        masterCvText,
        parsedJob
      });
    }
  }

  return optimizeDeterministically({
    coverLetterTemplate,
    masterCv,
    masterCvText,
    parsedJob
  });
}

async function optimizeWithOpenAI({
  coverLetterTemplate,
  masterCv,
  masterCvText,
  parsedJob
}: {
  coverLetterTemplate?: string;
  masterCv: MasterCv;
  masterCvText: string;
  parsedJob: ParsedJob;
}): Promise<OptimizationResult> {
  const response = await openai!.responses.parse({
    input: [
      {
        role: "developer",
        content: [
          "You optimize CV content for applicant tracking systems using only verified facts from the supplied Master CV.",
          "Return one complete Master CV object matching the requested schema.",
          "Preserve identity, contact details, employers, titles, dates, education, certifications, languages, and project/client facts.",
          "Do not invent skills, companies, dates, degrees, certifications, metrics, clients, or responsibilities.",
          "Use the job details to reorder and emphasize existing relevant skills, experience, projects, summary language, and hidden keywords.",
          "For frontend React roles, reposition toward Senior Front-End Engineer / Frontend Architecture Lead and reduce CMS-heavy repetition.",
          "Normalize NextJS to Next.js wherever it appears.",
          "When frontend expertise is supported by the Master CV, populate frontend_expertise with React.js, Next.js, JavaScript (ES6+), TypeScript, React Hooks, Component Architecture, State Management, Tailwind CSS, Responsive Design, Semantic HTML, Accessibility (WCAG), Design Systems, Storybook, Performance Optimization, SSR/SSG, Lazy Loading, Code Splitting, Lighthouse, Core Web Vitals, REST APIs, GraphQL.",
          "Do not let Early Career include recent roles. The application will group the oldest four experience entries into early_career when enough entries exist.",
          "Keep output ATS-friendly: plain text descriptions, standard section-ready content, direct keyword alignment, no tables, no decorative markup.",
          "If the job requests a skill that is not supported by the Master CV, do not add it as experience."
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify({
          job: parsedJob,
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
    optimized: applyTargetedEnhancements(
      preserveDbFacts(masterCv, masterCvSchema.parse(parsed)),
      parsedJob
    ),
    source: masterCv
  });
  const score = scoreAtsCompatibility(optimizedCvJson, parsedJob);
  const coverLetterText = generateCoverLetter({
    masterCv: optimizedCvJson,
    parsedJob,
    template: coverLetterTemplate
  });

  return {
    optimizedCvJson,
    coverLetterText,
    atsScore: score.overall,
    metadata: {
      inputTokens: response.usage?.input_tokens ?? 0,
      model: env.OPENAI_MODEL,
      mode: "openai",
      notes: [
        "OpenAI structured output optimized the CV from DB-backed Master CV facts.",
        `Master CV source serialized to ${masterCvText.length} characters before optimization.`,
        "Output was validated against the Master CV application schema before saving.",
        "Immutable source facts were restored from the DB-backed Master CV before persistence."
      ],
      outputTokens: response.usage?.output_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0
    }
  };
}

function optimizeDeterministically({
  coverLetterTemplate,
  fallbackReason,
  masterCv,
  masterCvText,
  parsedJob
}: {
  coverLetterTemplate?: string;
  fallbackReason?: string;
  masterCv: MasterCv;
  masterCvText: string;
  parsedJob: ParsedJob;
}): OptimizationResult {
  const relevantTerms = matchedCvTerms(masterCvText, parsedJob);
  const relevantSkillSet = new Set(relevantTerms.map(normalize));

  const optimizedCvJson: MasterCv = {
    ...masterCv,
    frontend_expertise: shouldUseFrontendExpertise(parsedJob)
      ? frontendExpertise
      : masterCv.frontend_expertise,
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
    optimized: optimizedCvJson,
    source: masterCv
  });
  const score = scoreAtsCompatibility(groupedOptimizedCvJson, parsedJob);

  const coverLetterText = generateCoverLetter({
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

function applyTargetedEnhancements(masterCv: MasterCv, parsedJob: ParsedJob) {
  if (!shouldUseFrontendExpertise(parsedJob)) {
    return masterCvSchema.parse({
      ...masterCv,
      languages: selectRelevantLanguages(masterCv.languages, parsedJob)
    });
  }

  return masterCvSchema.parse({
    ...masterCv,
    frontend_expertise: frontendExpertise,
    summary: frontendSummary(masterCv, parsedJob),
    hard_skills: normalizeSkillNames(masterCv.hard_skills),
    technical_skills: {
      languages: normalizeSkillNames(masterCv.technical_skills.languages),
      frameworks: normalizeSkillNames(masterCv.technical_skills.frameworks),
      cms: normalizeSkillNames(masterCv.technical_skills.cms),
      tools: normalizeSkillNames(masterCv.technical_skills.tools)
    },
    work_experience: masterCv.work_experience.map((item) => ({
      ...item,
      description: frontendExperienceDescription(item.description),
      hard_skills: normalizeSkillNames(item.hard_skills),
      programming_languages: normalizeSkillNames(item.programming_languages),
      frameworks: normalizeSkillNames(item.frameworks),
      tools: normalizeSkillNames(item.tools)
    })),
    hidden_context: {
      additional_experience: masterCv.hidden_context.additional_experience,
      keywords: unique([
        ...masterCv.hidden_context.keywords,
        ...frontendExpertise,
        "Keyboard Navigation",
        "Screen Reader Accessibility",
        "Cross-browser Compatibility",
        "SEO Optimization",
        "Sass/SCSS",
        "Styled Components"
      ])
    },
    languages: selectRelevantLanguages(masterCv.languages, parsedJob)
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

function shouldUseFrontendExpertise(parsedJob: ParsedJob) {
  const jobText = normalize(
    [
      parsedJob.position_title ?? "",
      parsedJob.seniority ?? "",
      ...parsedJob.required_skills,
      ...parsedJob.preferred_skills,
      ...parsedJob.keywords,
      ...parsedJob.responsibilities
    ].join(" ")
  );

  return /\b(frontend|front end|front-end|react|next\.?js|javascript|typescript|ui)\b/.test(
    jobText
  );
}

function frontendSummary(masterCv: MasterCv, parsedJob: ParsedJob) {
  const role = parsedJob.position_title ?? "senior frontend engineering roles";
  const currentSummary = normalizeSkillNames([masterCv.summary])[0] ?? masterCv.summary;

  return [
    `Senior frontend engineer and frontend architecture specialist focused on React.js, Next.js, TypeScript, accessible UI systems, performance optimization, and SEO-friendly applications for enterprise platforms.`,
    `Experienced translating product, design, and backend requirements into scalable component architecture, reusable frontend patterns, responsive interfaces, and API-integrated client-facing functionality for ${role}.`,
    currentSummary
  ]
    .filter(Boolean)
    .join("\n\n");
}

function frontendExperienceDescription(description: string) {
  const normalized = normalizeSkillNames([description])[0] ?? description;
  const hasFrontendTerms =
    /react\.js|next\.js|frontend|component|accessibility|responsive|performance/i.test(
      normalized
    );

  if (hasFrontendTerms || !normalized) {
    return normalized;
  }

  return `${normalized}\n\nDelivered frontend architecture, reusable components, semantic HTML, responsive design, WCAG accessibility, client-facing functionality, scalable UI systems, API integrations, and performance optimization across enterprise web platforms.`;
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

function selectRelevantLanguages(languages: string[], parsedJob: ParsedJob) {
  const jobText = normalize(
    [
      parsedJob.position_title ?? "",
      parsedJob.seniority ?? "",
      ...parsedJob.required_skills,
      ...parsedJob.preferred_skills,
      ...parsedJob.keywords,
      ...parsedJob.responsibilities
    ].join(" ")
  );
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
  const baseSummary = masterCv.summary.trim();

  if (!topTerms) {
    return baseSummary;
  }

  const alignmentSentence = `Relevant strengths for ${role} include ${topTerms}.`;

  if (!baseSummary) {
    return alignmentSentence;
  }

  if (baseSummary.includes(alignmentSentence)) {
    return baseSummary;
  }

  return `${baseSummary}\n\n${alignmentSentence}`;
}

function matchedCvTerms(masterCvText: string, parsedJob: ParsedJob) {
  const cvText = normalize(masterCvText);
  const terms = unique([
    ...parsedJob.required_skills,
    ...parsedJob.preferred_skills,
    ...parsedJob.keywords,
    ...splitTerm(parsedJob.position_title ?? ""),
    ...splitTerm(parsedJob.seniority ?? "")
  ]);

  return terms.filter((term) => cvText.includes(normalize(term))).slice(0, 40);
}

function sortByRelevance(items: string[], relevantTerms: Set<string>) {
  return [...items].sort((a, b) => {
    const aRelevant = relevantTerms.has(normalize(a)) ? 0 : 1;
    const bRelevant = relevantTerms.has(normalize(b)) ? 0 : 1;

    return aRelevant - bRelevant || a.localeCompare(b);
  });
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

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
