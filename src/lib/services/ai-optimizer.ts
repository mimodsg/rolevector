import type { MasterCv } from "@/lib/schemas/master-cv";
import type { ParsedJob } from "@/lib/schemas/job";
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
  masterCv,
  parsedJob
}: {
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
    core_skills: [...masterCv.core_skills].sort((a, b) => {
      const aRelevant = relevantSkills.has(a.toLowerCase()) ? 0 : 1;
      const bRelevant = relevantSkills.has(b.toLowerCase()) ? 0 : 1;
      return aRelevant - bRelevant || a.localeCompare(b);
    })
  };

  const role = parsedJob.position_title ?? "the role";
  const company = parsedJob.company_name ?? "your team";

  return {
    optimizedCvJson,
    coverLetterText: [
      "Dear hiring team,",
      "",
      `I am excited to apply for ${role} at ${company}. My background aligns with the requirements you described, especially around ${optimizedCvJson.core_skills.slice(0, 4).join(", ") || "the requested experience"}.`,
      "",
      "I would welcome the opportunity to discuss how my experience can support your hiring goals.",
      "",
      "Sincerely,",
      optimizedCvJson.basics.full_name
    ].join("\n"),
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
