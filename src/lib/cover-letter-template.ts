import type { MasterCv } from "@/lib/schemas/master-cv";
import type { ParsedJob } from "@/lib/schemas/job";

export const coverLetterTokens = [
  { token: "[Company]", description: "Target company from the job description." },
  { token: "[Role]", description: "Target role from the job description." },
  { token: "[Salary]", description: "Salary from the job opening, when provided." },
  { token: "[FullName]", description: "Master CV full name." },
  { token: "[Title]", description: "Master CV professional title." },
  { token: "[Email]", description: "Master CV email." },
  { token: "[Phone]", description: "Master CV phone." },
  { token: "[Location]", description: "Master CV location." },
  { token: "[LinkedIn]", description: "Master CV LinkedIn URL." },
  { token: "[Website]", description: "Master CV website." },
  { token: "[Summary]", description: "Professional summary." },
  { token: "[HardSkills]", description: "Hard skills list." },
  { token: "[SoftSkills]", description: "Soft skills list." },
  { token: "[ProgrammingLanguages]", description: "Programming languages list." },
  { token: "[Frameworks]", description: "Frameworks list." },
  { token: "[CMS]", description: "CMS list." },
  { token: "[Tools]", description: "Tools list." },
  { token: "[WorkExperience]", description: "Formatted work experience entries." },
  { token: "[Projects]", description: "Formatted key projects." },
  { token: "[Education]", description: "Formatted education entries." },
  { token: "[Certifications]", description: "Certifications list." },
  { token: "[Languages]", description: "Spoken languages list." },
  { token: "[AdditionalExperience]", description: "Hidden additional experience." },
  { token: "[Keywords]", description: "Hidden keywords list." }
] as const;

export function renderCoverLetterTemplate({
  masterCv,
  parsedJob,
  template
}: {
  masterCv: MasterCv;
  parsedJob: ParsedJob;
  template: string;
}) {
  const replacements: Record<string, string> = {
    "[Company]": parsedJob.company_name ?? "your team",
    "[Role]": parsedJob.position_title ?? "the role",
    "[Salary]": parsedJob.salary ?? "",
    "[FullName]": masterCv.basics.full_name,
    "[Title]": masterCv.basics.title,
    "[Email]": masterCv.basics.email,
    "[Phone]": masterCv.basics.phone,
    "[Location]": masterCv.basics.location,
    "[LinkedIn]": masterCv.basics.linkedin,
    "[Website]": masterCv.basics.website,
    "[Summary]": masterCv.summary,
    "[HardSkills]": renderList(masterCv.hard_skills),
    "[SoftSkills]": renderList(masterCv.soft_skills),
    "[ProgrammingLanguages]": renderList(masterCv.technical_skills.languages),
    "[Frameworks]": renderList(masterCv.technical_skills.frameworks),
    "[CMS]": renderList(masterCv.technical_skills.cms),
    "[Tools]": renderList(masterCv.technical_skills.tools),
    "[WorkExperience]": renderWorkExperience(masterCv),
    "[Projects]": renderProjectHighlights(masterCv),
    "[Education]": renderEducation(masterCv),
    "[Certifications]": renderList(masterCv.certifications),
    "[Languages]": renderList(masterCv.languages),
    "[AdditionalExperience]": renderList(masterCv.hidden_context.additional_experience, "\n"),
    "[Keywords]": renderList(masterCv.hidden_context.keywords)
  };

  return Object.entries(replacements).reduce(
    (content, [token, value]) => content.replaceAll(token, value),
    template
  );
}

function renderList(items: string[], separator = ", ") {
  return items.filter(Boolean).join(separator);
}

function renderWorkExperience(masterCv: MasterCv) {
  if (masterCv.work_experience.length === 0) {
    return "";
  }

  return masterCv.work_experience
    .map((item) => {
      const dates = [item.start_date, item.current ? "Present" : item.end_date]
        .filter(Boolean)
        .join(" - ");
      const header = [item.title, item.company, dates].filter(Boolean).join(" · ");
      const skills = [
        ...item.hard_skills,
        ...item.soft_skills,
        ...item.programming_languages,
        ...item.frameworks,
        ...item.cms,
        ...item.tools
      ];

      return [
        `- ${header}`,
        item.location ? `  Location: ${item.location}` : "",
        item.engagement_type ? `  Engagement: ${item.engagement_type}` : "",
        item.description ? `  ${item.description}` : "",
        skills.length ? `  Skills: ${renderList(skills)}` : ""
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
}

function renderProjectHighlights(masterCv: MasterCv) {
  if (masterCv.projects.length === 0) {
    return "";
  }

  return masterCv.projects
    .map((project) => {
      const client = project.client ? ` for ${project.client}` : "";
      const description = project.description ? `: ${project.description}` : "";

      return `- ${project.title}${client}${description}`;
    })
    .join("\n");
}

function renderEducation(masterCv: MasterCv) {
  if (masterCv.education.length === 0) {
    return "";
  }

  return masterCv.education
    .map((item) => {
      const dates = [item.start_date, item.end_date].filter(Boolean).join(" - ");
      const details = [item.degree, item.institution, item.location, dates].filter(Boolean);

      return `- ${details.join(" · ")}`;
    })
    .join("\n");
}
