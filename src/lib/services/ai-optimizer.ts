import type { MasterCv } from "@/lib/schemas/master-cv";
import type { ParsedJob } from "@/lib/schemas/job";
import { renderCoverLetterTemplate } from "@/lib/cover-letter-template";
import { env } from "@/lib/env";
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
  parsedJob
}: {
  coverLetterTemplate?: string;
  masterCv: MasterCv;
  parsedJob: ParsedJob;
}): Promise<OptimizationResult> {
  const score = scoreAtsCompatibility(masterCv, parsedJob);
  const relevantSkills = new Set(
    [...parsedJob.required_skills, ...parsedJob.keywords].map((skill) =>
      skill.toLowerCase()
    )
  );

  const optimizedCvJson: MasterCv = {
    ...masterCv,
    hard_skills: [...masterCv.hard_skills].sort((a, b) => {
      const aRelevant = relevantSkills.has(a.toLowerCase()) ? 0 : 1;
      const bRelevant = relevantSkills.has(b.toLowerCase()) ? 0 : 1;
      return aRelevant - bRelevant || a.localeCompare(b);
    })
  };

  const role = parsedJob.position_title ?? "the role";
  const company = parsedJob.company_name ?? "your team";
  const coverLetterText = coverLetterTemplate?.trim()
    ? renderCoverLetterTemplate({
        masterCv: optimizedCvJson,
        parsedJob,
        template: coverLetterTemplate
      })
    : [
        "Dear hiring team,",
        "",
        `I am excited to apply for ${role} at ${company}. My background aligns with the requirements you described, especially around ${optimizedCvJson.hard_skills.slice(0, 4).join(", ") || "the requested experience"}.`,
        "",
        "I would welcome the opportunity to discuss how my experience can support your hiring goals.",
        "",
        "Sincerely,",
        optimizedCvJson.basics.full_name
      ].join("\n");

  return {
    optimizedCvJson,
    coverLetterText,
    atsScore: score.overall,
    metadata: {
      model: env.OPENAI_MODEL,
      mode: env.OPENAI_API_KEY ? "openai" : "mock",
      notes: [
        "Scaffold implementation preserves factual master CV data.",
        "Replace this mock optimizer with OpenAI structured output in the next phase."
      ]
    }
  };
}
