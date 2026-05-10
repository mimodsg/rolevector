import type { MasterCv } from "@/lib/schemas/master-cv";
import type { ParsedJob } from "@/lib/schemas/job";
import { env } from "@/lib/env";
import { generateCoverLetter } from "./cover-letter-generator";
import { scoreAtsCompatibility } from "./ats-scoring";

export type OptimizationResult = {
  optimizedCvJson: MasterCv;
  coverLetterText: string;
  atsScore: number;
  metadata: {
    model: string;
    mode: "mock" | "openai";
    notes: string[];
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
  const relevantTerms = matchedCvTerms(masterCvText, parsedJob);
  const relevantSkillSet = new Set(relevantTerms.map(normalize));

  const optimizedCvJson: MasterCv = {
    ...masterCv,
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
      }))
      .sort(
        (a, b) =>
          relevanceScore(experienceText(b), relevantTerms) -
          relevanceScore(experienceText(a), relevantTerms)
      ),
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
      model: env.OPENAI_MODEL,
      mode: "mock",
      notes: [
        "Deterministic ATS pass preserves factual Master CV data.",
        `Master CV source serialized to ${masterCvText.length} characters before optimization.`,
        `Matched ${relevantTerms.length} job terms already present in the application CV.`,
        "Skills, work experience, projects, and summary emphasis were reordered for job relevance."
      ]
    }
  };
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

function experienceText(item: MasterCv["work_experience"][number]) {
  return [
    item.company,
    item.title,
    item.location,
    item.engagement_type,
    item.description,
    ...item.hard_skills,
    ...item.soft_skills,
    ...item.programming_languages,
    ...item.frameworks,
    ...item.cms,
    ...item.tools
  ].join(" ");
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
