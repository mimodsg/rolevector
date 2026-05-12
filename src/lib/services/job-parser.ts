import { parsedJobSchema, type ParsedJob } from "@/lib/schemas/job";

const skillKeywords = [
  "API",
  "Accessibility",
  "Acquia",
  "Agile",
  "Akamai",
  "Angular",
  "CI/CD",
  "CMS",
  "CSS",
  "Docker",
  "Drupal",
  "Drupal 7",
  "Drupal 8",
  "Drupal 9",
  "GraphQL",
  "HTML5",
  "JavaScript",
  "JIRA",
  "Kubernetes",
  "Linux",
  "Microsoft SQL",
  "MySQL",
  "Next.js",
  "Node.js",
  "OpenAI",
  "PDF",
  "PHP",
  "PostgreSQL",
  "Prisma",
  "Rancher",
  "React",
  "ReactJS",
  "Responsive Design",
  "REST",
  "Sass",
  "SCSS",
  "SDLC",
  "SiteImprove",
  "SOLR",
  "TailwindCSS",
  "Twig",
  "TypeScript"
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
    normalize(jobDetails).includes(normalize(skill))
  );
  const responsibilities = lines
    .filter((line) =>
      /^[-*]|responsib|required|qualification|experience|development|architecture|migration|implementation|troubleshooting|maintenance|mentor|technical/i.test(
        line
      )
    )
    .slice(0, 16);

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
    responsibilities,
    keywords: Array.from(
      new Set([
        ...matchedSkills,
        ...jobDetails.match(/\b[A-Z][A-Za-z0-9.+#-]{2,}\b/g)?.slice(0, 20) ?? []
      ])
    )
  });
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}
