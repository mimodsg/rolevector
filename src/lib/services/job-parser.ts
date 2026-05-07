import { parsedJobSchema, type ParsedJob } from "@/lib/schemas/job";

const skillKeywords = [
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
  "Node.js",
  "PostgreSQL",
  "Prisma",
  "TailwindCSS",
  "OpenAI",
  "API",
  "PDF"
];

export function parseJobDescription(jobDescription: string): ParsedJob {
  const lines = jobDescription
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const matchedSkills = skillKeywords.filter((skill) =>
    jobDescription.toLowerCase().includes(skill.toLowerCase())
  );

  const positionLine =
    lines.find((line) => /developer|engineer|designer|manager|lead/i.test(line)) ??
    null;

  return parsedJobSchema.parse({
    company_name: null,
    position_title: positionLine,
    location:
      lines.find((line) => /remote|hybrid|onsite|new york|san francisco/i.test(line)) ??
      null,
    seniority:
      jobDescription.match(/\b(junior|mid|senior|staff|principal|lead)\b/i)?.[0] ??
      null,
    required_skills: matchedSkills,
    preferred_skills: [],
    responsibilities: lines.filter((line) => /^[-*]|responsib/i.test(line)).slice(0, 8),
    keywords: Array.from(
      new Set([
        ...matchedSkills,
        ...jobDescription.match(/\b[A-Z][A-Za-z0-9.+#-]{2,}\b/g)?.slice(0, 20) ?? []
      ])
    )
  });
}
