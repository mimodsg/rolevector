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

export function parseJobDescription({
  company,
  jobDetails,
  positionTitle,
  salary
}: {
  company: string;
  jobDetails: string;
  positionTitle: string;
  salary?: string;
}): ParsedJob {
  const lines = jobDetails
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const matchedSkills = skillKeywords.filter((skill) =>
    jobDetails.toLowerCase().includes(skill.toLowerCase())
  );

  return parsedJobSchema.parse({
    company_name: company,
    position_title: positionTitle,
    salary: salary || null,
    location:
      lines.find((line) => /remote|hybrid|onsite|new york|san francisco/i.test(line)) ??
      null,
    seniority:
      jobDetails.match(/\b(junior|mid|senior|staff|principal|lead)\b/i)?.[0] ??
      null,
    required_skills: matchedSkills,
    preferred_skills: [],
    responsibilities: lines.filter((line) => /^[-*]|responsib/i.test(line)).slice(0, 8),
    keywords: Array.from(
      new Set([
        ...matchedSkills,
        ...jobDetails.match(/\b[A-Z][A-Za-z0-9.+#-]{2,}\b/g)?.slice(0, 20) ?? []
      ])
    )
  });
}
