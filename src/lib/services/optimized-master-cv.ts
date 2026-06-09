import { readFileSync } from "node:fs";
import path from "node:path";
import type { OptimizedMasterCV } from "@prisma/client";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { masterCvSchema, type MasterCv } from "../schemas/master-cv.ts";

type SkillBucket =
  | "hard_skills"
  | "soft_skills"
  | "technical_skills.languages"
  | "technical_skills.frameworks"
  | "technical_skills.cms"
  | "technical_skills.tools";

type BaseSuggestion = {
  id: string;
  reason: string;
};

export type SkillSuggestion = BaseSuggestion & {
  bucket: SkillBucket;
  evidence: string[];
  skill: string;
  type: "add_skill" | "remove_skill";
};

export type EditorialSuggestion = BaseSuggestion & {
  currentText: string;
  entityLabel: string;
  entityType: "experience" | "project";
  index: number;
  suggestedText: string;
  type: "edit_experience" | "edit_project";
};

export type OptimizedMasterCvSuggestions = {
  editorialUpdates: EditorialSuggestion[];
  skillsMissing: SkillSuggestion[];
  skillsToRemove: SkillSuggestion[];
};

export type OptimizedMasterCvRecord = Pick<
  OptimizedMasterCV,
  | "id"
  | "revisionNumber"
  | "isMain"
  | "appliedSuggestionIds"
  | "promotedAt"
  | "createdAt"
  | "updatedAt"
> & {
  cvJson: MasterCv;
};

type SkillEvidence = {
  bucket: SkillBucket;
  evidence: Set<string>;
  normalized: string;
  skill: string;
};

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  : null;

const aiEditorialSuggestionSchema = z.object({
  editorial_updates: z
    .array(
      z.object({
        entity_type: z.enum(["experience", "project"]),
        index: z.number().int().min(0),
        reason: z.string().default(""),
        suggested_text: z.string()
      })
    )
    .default([])
});
const AI_EDITORIAL_TIMEOUT_MS = 15000;

const punctuationPattern = /[.!?]$/;
const metricPattern = /\b\d+(?:[.,]\d+)?(?:%|x|k|m|b)?\b/i;
const whitespacePattern = /\s+/g;

function normalizeText(value: string) {
  return value.trim().replace(whitespacePattern, " ");
}

function normalizeParagraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => normalizeText(paragraph))
    .filter(Boolean);
}

function normalizeSkill(value: string) {
  return value.trim().toLowerCase();
}

function ensureSentence(value: string) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "";
  }

  return punctuationPattern.test(normalized) ? normalized : `${normalized}.`;
}

function ensureParagraphText(value: string) {
  return normalizeParagraphs(value)
    .map((paragraph) => ensureSentence(paragraph))
    .filter(Boolean)
    .join("\n\n");
}

function appendParagraph(base: string, addition: string) {
  const nextParagraph = ensureSentence(addition);

  if (!nextParagraph) {
    return ensureParagraphText(base);
  }

  const paragraphs = normalizeParagraphs(base);

  return [...paragraphs.map((paragraph) => ensureSentence(paragraph)), nextParagraph].join("\n\n");
}

function isConciseDescription(value: string) {
  const paragraphs = normalizeParagraphs(value);
  const normalized = paragraphs.join(" ");

  return paragraphs.length <= 2 && normalized.length <= 220;
}

function splitSentences(value: string) {
  return normalizeText(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function summarizeLongDescription(paragraphs: string[], technologies: string[]) {
  const sentencePool = paragraphs.flatMap((paragraph) => splitSentences(paragraph));
  const selected: string[] = [];
  const maxSentences = sentencePool.length >= 3 ? 2 : 3;

  for (const sentence of sentencePool) {
    const normalizedSentence = normalizeSkill(sentence);

    if (
      selected.some(
        (existing) =>
          normalizeSkill(existing) === normalizedSentence ||
          normalizeSkill(existing).includes(normalizedSentence) ||
          normalizedSentence.includes(normalizeSkill(existing))
      )
    ) {
      continue;
    }

    selected.push(ensureSentence(sentence));

    if (selected.length === maxSentences) {
      break;
    }
  }

  const condensed = selected.join(" ");

  if (!condensed) {
    return "";
  }

  if (
    technologies.length > 0 &&
    !technologies.some((skill) => normalizeSkill(condensed).includes(normalizeSkill(skill)))
  ) {
    return `${condensed} ${ensureSentence(
      `Core technologies included ${technologies.slice(0, 8).join(", ")}`
    )}`;
  }

  return condensed;
}

function loadAgentPrompt(fileName: string) {
  const filePath = path.join(process.cwd(), "agents", fileName);

  return readFileSync(filePath, "utf8");
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function topLevelSkills(masterCv: MasterCv) {
  return [
    { bucket: "hard_skills" as const, values: masterCv.hard_skills },
    { bucket: "soft_skills" as const, values: masterCv.soft_skills },
    { bucket: "technical_skills.languages" as const, values: masterCv.technical_skills.languages },
    {
      bucket: "technical_skills.frameworks" as const,
      values: masterCv.technical_skills.frameworks
    },
    { bucket: "technical_skills.cms" as const, values: masterCv.technical_skills.cms },
    { bucket: "technical_skills.tools" as const, values: masterCv.technical_skills.tools }
  ];
}

function buildProjectEvidenceMap(masterCv: MasterCv) {
  const knownSkills = topLevelSkills(masterCv)
    .flatMap(({ values }) => values)
    .concat(
      ...masterCv.work_experience.map((item) => [
        ...item.hard_skills,
        ...item.soft_skills,
        ...item.programming_languages,
        ...item.frameworks,
        ...item.cms,
        ...item.tools
      ])
    );
  const uniqueKnownSkills = uniqueValues(knownSkills);
  const evidence = new Map<string, Set<string>>();

  masterCv.projects.forEach((project) => {
    const haystack = normalizeSkill(project.description);

    uniqueKnownSkills.forEach((skill) => {
      if (!haystack || !haystack.includes(normalizeSkill(skill))) {
        return;
      }

      const key = normalizeSkill(skill);
      const current = evidence.get(key) ?? new Set<string>();
      current.add(`Project: ${project.title}`);
      evidence.set(key, current);
    });
  });

  return evidence;
}

function collectSkillEvidence(masterCv: MasterCv) {
  const projectEvidence = buildProjectEvidenceMap(masterCv);
  const evidence = new Map<string, SkillEvidence>();

  function track(bucket: SkillBucket, skill: string, source: string) {
    const normalized = normalizeSkill(skill);

    if (!normalized) {
      return;
    }

    const current =
      evidence.get(`${bucket}:${normalized}`) ??
      ({
        bucket,
        evidence: new Set<string>(),
        normalized,
        skill: skill.trim()
      } satisfies SkillEvidence);

    current.evidence.add(source);
    evidence.set(`${bucket}:${normalized}`, current);
  }

  masterCv.work_experience.forEach((item) => {
    const label = `${item.title} @ ${item.company}`;
    item.hard_skills.forEach((skill) => track("hard_skills", skill, label));
    item.soft_skills.forEach((skill) => track("soft_skills", skill, label));
    item.programming_languages.forEach((skill) =>
      track("technical_skills.languages", skill, label)
    );
    item.frameworks.forEach((skill) => track("technical_skills.frameworks", skill, label));
    item.cms.forEach((skill) => track("technical_skills.cms", skill, label));
    item.tools.forEach((skill) => track("technical_skills.tools", skill, label));
  });

  for (const { bucket, values } of topLevelSkills(masterCv)) {
    values.forEach((skill) => {
      const sources = projectEvidence.get(normalizeSkill(skill));

      if (!sources?.size) {
        return;
      }

      sources.forEach((source) => track(bucket, skill, source));
    });
  }

  return evidence;
}

function editableExperienceDescription(item: MasterCv["work_experience"][number]) {
  const technologies = uniqueValues([
    ...item.programming_languages,
    ...item.frameworks,
    ...item.cms,
    ...item.tools
  ]);
  const base = ensureParagraphText(item.description);
  const mentionsStack =
    technologies.length === 0 ||
    technologies.some((skill) => normalizeSkill(base).includes(normalizeSkill(skill)));

  if (!base) {
    const fragments = [
      `Delivered ${item.title} work at ${item.company}`,
      technologies.length > 0 ? `using ${technologies.join(", ")}` : "",
      item.location ? `from ${item.location}` : ""
    ].filter(Boolean);

    return ensureSentence(fragments.join(" "));
  }

  if (!isConciseDescription(base)) {
    return summarizeLongDescription(normalizeParagraphs(base), technologies) || base;
  }

  if (!mentionsStack && technologies.length > 0) {
    return appendParagraph(base, `Key technologies: ${technologies.join(", ")}`);
  }

  if (!metricPattern.test(base) && technologies.length > 0) {
    return appendParagraph(base, `Technology scope included ${technologies.join(", ")}`);
  }

  return base;
}

function editableProjectDescription(
  item: MasterCv["projects"][number],
  masterCv: MasterCv
) {
  const relatedExperience = masterCv.work_experience.find(
    (experience) => normalizeSkill(experience.company) === normalizeSkill(item.client)
  );
  const technologies = relatedExperience
    ? uniqueValues([
        ...relatedExperience.programming_languages,
        ...relatedExperience.frameworks,
        ...relatedExperience.cms,
        ...relatedExperience.tools
      ]).slice(0, 5)
    : [];
  const base = ensureParagraphText(item.description);

  if (!base) {
    const fragments = [
      `Built ${item.title}`,
      item.client ? `for ${item.client}` : "",
      technologies.length > 0 ? `using ${technologies.join(", ")}` : ""
    ].filter(Boolean);

    return ensureSentence(fragments.join(" "));
  }

  if (!isConciseDescription(base)) {
    return summarizeLongDescription(normalizeParagraphs(base), technologies) || base;
  }

  if (
    technologies.length > 0 &&
    !technologies.some((skill) => normalizeSkill(base).includes(normalizeSkill(skill)))
  ) {
    return appendParagraph(base, `Key technologies: ${technologies.join(", ")}`);
  }

  return base;
}

function generateDeterministicEditorialSuggestions(
  masterCv: MasterCv
): EditorialSuggestion[] {
  const editorialUpdates: EditorialSuggestion[] = [];

  masterCv.work_experience.forEach((item, index) => {
    const suggestedText = editableExperienceDescription(item);
    const currentText = ensureParagraphText(item.description);

    if (suggestedText && suggestedText !== currentText) {
      editorialUpdates.push({
        currentText: item.description,
        entityLabel: `${item.title} @ ${item.company}`,
        entityType: "experience",
        id: `edit:experience:${index}`,
        index,
        reason: "Tightens the description using facts already captured in the entry.",
        suggestedText,
        type: "edit_experience"
      });
    }
  });

  masterCv.projects.forEach((item, index) => {
    const suggestedText = editableProjectDescription(item, masterCv);
    const currentText = ensureParagraphText(item.description);

    if (suggestedText && suggestedText !== currentText) {
      editorialUpdates.push({
        currentText: item.description,
        entityLabel: item.title,
        entityType: "project",
        id: `edit:project:${index}`,
        index,
        reason: "Clarifies the project description without adding unsupported claims.",
        suggestedText,
        type: "edit_project"
      });
    }
  });

  return editorialUpdates;
}

async function generateAiEditorialSuggestions(
  masterCv: MasterCv
): Promise<EditorialSuggestion[] | null> {
  if (!openai) {
    return null;
  }

  try {
    const prompt = loadAgentPrompt("cv-editor.agent.md");
    const response = await Promise.race([
      openai.responses.parse({
        input: [
          {
            role: "developer",
            content: [
              prompt,
              "For this task, do not rewrite the full CV.",
              "Generate editorial suggestions only for work experience and project descriptions.",
              "Use only facts already present in the structured Master CV.",
              "Evaluate whether the current text is too long, too bombastic, inflated, repetitive, vague, or stack-heavy.",
              "Prefer rewrites that make the text more professional, believable, concise, and expertise-demonstrating.",
              "Show expertise through concrete responsibilities, technical scope, architectural judgment, collaboration, and delivery context.",
              "If a description is already strong, return no suggestion for it.",
              "Preserve paragraph breaks and list-style readability. Do not collapse multiple paragraphs into one block.",
              "Do not make suggestions that only tack a technology list onto the end unless that materially improves clarity and remains concise.",
              "Prefer rewrites that improve readability, specificity, credibility, and flow of the existing content.",
              "Return suggestions only when the wording materially improves the current text.",
              "Return the structured response format only."
            ].join("\n")
          },
          {
            role: "user",
            content: JSON.stringify({
              master_cv_structured: masterCv
            })
          }
        ],
        max_output_tokens: 5000,
        model: process.env.OPENAI_MODEL || "gpt-5",
        text: {
          format: zodTextFormat(aiEditorialSuggestionSchema, "editorial_suggestions")
        }
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("AI editorial suggestion timeout"));
        }, AI_EDITORIAL_TIMEOUT_MS);
      })
    ]);
    const parsed = response.output_parsed;

    if (!parsed) {
      return null;
    }

    return parsed.editorial_updates.flatMap<EditorialSuggestion>((item) => {
      const suggestedText = ensureParagraphText(item.suggested_text);

      if (!suggestedText) {
        return [];
      }

      if (item.entity_type === "experience") {
        const experience = masterCv.work_experience[item.index];

        if (!experience) {
          return [];
        }

        const currentText = ensureParagraphText(experience.description);

        if (!currentText || suggestedText === currentText) {
          return [];
        }

        return [
          {
            currentText: experience.description,
            entityLabel: `${experience.title} @ ${experience.company}`,
            entityType: "experience" as const,
            id: `edit:experience:${item.index}`,
            index: item.index,
            reason:
              item.reason || "Refines the experience description using supported CV facts.",
            suggestedText,
            type: "edit_experience" as const
          }
        ];
      }

      const project = masterCv.projects[item.index];

      if (!project) {
        return [];
      }

      const currentText = ensureParagraphText(project.description);

      if (!currentText || suggestedText === currentText) {
        return [];
      }

      return [
        {
          currentText: project.description,
          entityLabel: project.title,
          entityType: "project" as const,
          id: `edit:project:${item.index}`,
          index: item.index,
          reason: item.reason || "Refines the project description using supported CV facts.",
          suggestedText,
          type: "edit_project" as const
        }
      ];
    });
  } catch {
    return null;
  }
}

export async function generateOptimizedMasterCvSuggestions(
  masterCv: MasterCv
): Promise<OptimizedMasterCvSuggestions> {
  const skillEvidence = collectSkillEvidence(masterCv);
  const topLevelMap = new Map<string, { bucket: SkillBucket; skill: string }>();

  for (const { bucket, values } of topLevelSkills(masterCv)) {
    values.forEach((skill) => {
      topLevelMap.set(`${bucket}:${normalizeSkill(skill)}`, {
        bucket,
        skill
      });
    });
  }

  const skillsMissing: SkillSuggestion[] = [];

  for (const [key, value] of skillEvidence.entries()) {
    if (topLevelMap.has(key)) {
      continue;
    }

    skillsMissing.push({
      bucket: value.bucket,
      evidence: [...value.evidence],
      id: `add:${value.bucket}:${value.normalized}`,
      reason: "Referenced in experience or project content but missing from the top-level skills.",
      skill: value.skill,
      type: "add_skill"
    });
  }

  const skillsToRemove: SkillSuggestion[] = [];

  for (const { bucket, values } of topLevelSkills(masterCv)) {
    values.forEach((skill) => {
      const key = `${bucket}:${normalizeSkill(skill)}`;

      if (skillEvidence.has(key)) {
        return;
      }

      skillsToRemove.push({
        bucket,
        evidence: [],
        id: `remove:${bucket}:${normalizeSkill(skill)}`,
        reason:
          "Not supported by the current experience entries or project descriptions.",
        skill,
        type: "remove_skill"
      });
    });
  }

  const editorialUpdates =
    (await generateAiEditorialSuggestions(masterCv)) ??
    generateDeterministicEditorialSuggestions(masterCv);

  skillsMissing.sort((a, b) => a.skill.localeCompare(b.skill));
  skillsToRemove.sort((a, b) => a.skill.localeCompare(b.skill));

  return {
    editorialUpdates,
    skillsMissing,
    skillsToRemove
  };
}

function appendSkill(masterCv: MasterCv, bucket: SkillBucket, skill: string) {
  if (bucket === "hard_skills") {
    return { ...masterCv, hard_skills: uniqueValues([...masterCv.hard_skills, skill]) };
  }

  if (bucket === "soft_skills") {
    return { ...masterCv, soft_skills: uniqueValues([...masterCv.soft_skills, skill]) };
  }

  if (bucket === "technical_skills.languages") {
    return {
      ...masterCv,
      technical_skills: {
        ...masterCv.technical_skills,
        languages: uniqueValues([...masterCv.technical_skills.languages, skill])
      }
    };
  }

  if (bucket === "technical_skills.frameworks") {
    return {
      ...masterCv,
      technical_skills: {
        ...masterCv.technical_skills,
        frameworks: uniqueValues([...masterCv.technical_skills.frameworks, skill])
      }
    };
  }

  if (bucket === "technical_skills.cms") {
    return {
      ...masterCv,
      technical_skills: {
        ...masterCv.technical_skills,
        cms: uniqueValues([...masterCv.technical_skills.cms, skill])
      }
    };
  }

  return {
    ...masterCv,
    technical_skills: {
      ...masterCv.technical_skills,
      tools: uniqueValues([...masterCv.technical_skills.tools, skill])
    }
  };
}

function removeSkill(masterCv: MasterCv, bucket: SkillBucket, skill: string) {
  const normalized = normalizeSkill(skill);

  if (bucket === "hard_skills") {
    return {
      ...masterCv,
      hard_skills: masterCv.hard_skills.filter((item) => normalizeSkill(item) !== normalized)
    };
  }

  if (bucket === "soft_skills") {
    return {
      ...masterCv,
      soft_skills: masterCv.soft_skills.filter((item) => normalizeSkill(item) !== normalized)
    };
  }

  if (bucket === "technical_skills.languages") {
    return {
      ...masterCv,
      technical_skills: {
        ...masterCv.technical_skills,
        languages: masterCv.technical_skills.languages.filter(
          (item) => normalizeSkill(item) !== normalized
        )
      }
    };
  }

  if (bucket === "technical_skills.frameworks") {
    return {
      ...masterCv,
      technical_skills: {
        ...masterCv.technical_skills,
        frameworks: masterCv.technical_skills.frameworks.filter(
          (item) => normalizeSkill(item) !== normalized
        )
      }
    };
  }

  if (bucket === "technical_skills.cms") {
    return {
      ...masterCv,
      technical_skills: {
        ...masterCv.technical_skills,
        cms: masterCv.technical_skills.cms.filter(
          (item) => normalizeSkill(item) !== normalized
        )
      }
    };
  }

  return {
    ...masterCv,
    technical_skills: {
      ...masterCv.technical_skills,
      tools: masterCv.technical_skills.tools.filter((item) => normalizeSkill(item) !== normalized)
    }
  };
}

export function applyOptimizedMasterCvSuggestions({
  masterCv,
  selectedSuggestionIds,
  suggestions
}: {
  masterCv: MasterCv;
  selectedSuggestionIds: string[];
  suggestions: OptimizedMasterCvSuggestions;
}) {
  const selected = new Set(selectedSuggestionIds);
  let nextCv = masterCvSchema.parse(masterCv);

  suggestions.skillsMissing.forEach((suggestion) => {
    if (selected.has(suggestion.id)) {
      nextCv = appendSkill(nextCv, suggestion.bucket, suggestion.skill);
    }
  });

  suggestions.skillsToRemove.forEach((suggestion) => {
    if (selected.has(suggestion.id)) {
      nextCv = removeSkill(nextCv, suggestion.bucket, suggestion.skill);
    }
  });

  suggestions.editorialUpdates.forEach((suggestion) => {
    if (!selected.has(suggestion.id)) {
      return;
    }

    if (suggestion.entityType === "experience") {
      nextCv = {
        ...nextCv,
        work_experience: nextCv.work_experience.map((item, index) =>
          index === suggestion.index ? { ...item, description: suggestion.suggestedText } : item
        )
      };
      return;
    }

    nextCv = {
      ...nextCv,
      projects: nextCv.projects.map((item, index) =>
        index === suggestion.index ? { ...item, description: suggestion.suggestedText } : item
      )
    };
  });

  return masterCvSchema.parse(nextCv);
}

export function optimizedMasterCvRecordToSummary(record: OptimizedMasterCV): OptimizedMasterCvRecord {
  return {
    appliedSuggestionIds: record.appliedSuggestionIds,
    createdAt: record.createdAt,
    cvJson: masterCvSchema.parse(record.cvJson),
    id: record.id,
    isMain: record.isMain,
    promotedAt: record.promotedAt,
    revisionNumber: record.revisionNumber,
    updatedAt: record.updatedAt
  };
}
