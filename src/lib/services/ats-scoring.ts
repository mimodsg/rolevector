import type { MasterCv } from "@/lib/schemas/master-cv";
import type { ParsedJob } from "@/lib/schemas/job";

export type AtsScoreBreakdown = {
  overall: number;
  keywordAlignment: number;
  skillMatch: number;
  formattingCompatibility: number;
  experienceAlignment: number;
};

export function scoreAtsCompatibility(
  masterCv: MasterCv,
  parsedJob: ParsedJob
): AtsScoreBreakdown {
  const cvKeywords = new Set(
    [
      ...masterCv.hard_skills,
      ...masterCv.soft_skills,
      ...masterCv.technical_skills.languages,
      ...masterCv.technical_skills.frameworks,
      ...masterCv.technical_skills.cms,
      ...masterCv.technical_skills.tools,
      ...masterCv.hidden_context.keywords
    ].map((keyword) => keyword.toLowerCase())
  );

  const requiredSkills = parsedJob.required_skills.map((skill) =>
    skill.toLowerCase()
  );
  const matchedSkills = requiredSkills.filter((skill) => cvKeywords.has(skill));
  const skillMatch =
    requiredSkills.length === 0
      ? 7
      : Math.min(10, (matchedSkills.length / requiredSkills.length) * 10);

  const keywordAlignment = Math.min(
    10,
    skillMatch + Math.min(2, parsedJob.keywords.length / 10)
  );
  const experienceAlignment = masterCv.work_experience.length > 0 ? 8 : 4;
  const formattingCompatibility = 10;
  const overall =
    keywordAlignment * 0.3 +
    skillMatch * 0.3 +
    experienceAlignment * 0.25 +
    formattingCompatibility * 0.15;

  return {
    overall: Number(overall.toFixed(1)),
    keywordAlignment: Number(keywordAlignment.toFixed(1)),
    skillMatch: Number(skillMatch.toFixed(1)),
    formattingCompatibility,
    experienceAlignment
  };
}
