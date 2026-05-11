import type { MasterCv } from "@/lib/schemas/master-cv";

export function masterCvToOptimizationText(masterCv: MasterCv) {
  return [
    renderBasics(masterCv),
    section("Professional Summary", masterCv.summary),
    section("Frontend Expertise", list(masterCv.frontend_expertise)),
    section("Hard Skills", list(masterCv.hard_skills)),
    section("Soft Skills", list(masterCv.soft_skills)),
    section(
      "Technical Skills",
      renderTechnicalSkills(masterCv)
    ),
    section("Work Experience", renderWorkExperience(masterCv)),
    section("Early Career", renderEarlyCareer(masterCv)),
    section("Key Projects", renderProjects(masterCv)),
    section("Education", renderEducation(masterCv)),
    section("Certifications", list(masterCv.certifications)),
    section("Languages", list(masterCv.languages)),
    section(
      "Hidden Context",
      [
        line("Additional experience", list(masterCv.hidden_context.additional_experience)),
        line("Keywords", list(masterCv.hidden_context.keywords))
      ]
        .filter(Boolean)
        .join("\n")
    )
  ]
    .filter(Boolean)
    .join("\n\n");
}

function renderTechnicalSkills(masterCv: MasterCv) {
  const frontend = unique([
    ...masterCv.frontend_expertise,
    ...masterCv.technical_skills.languages.filter((item) =>
      /javascript|typescript/i.test(item)
    ),
    ...masterCv.technical_skills.frameworks.filter((item) =>
      /react|next|tailwind|storybook|styled|sass|scss/i.test(item)
    )
  ]);
  const backend = unique(
    [
      ...masterCv.hard_skills,
      ...masterCv.technical_skills.languages,
      ...masterCv.technical_skills.frameworks,
      ...masterCv.technical_skills.tools
    ].filter((item) =>
      /node|api|rest|graphql|php|\.net|c#|postgres|sql|prisma|backend/i.test(item)
    )
  );
  const cms = masterCv.technical_skills.cms;
  const tooling = unique(
    masterCv.technical_skills.tools.filter(
      (item) => !backend.some((backendItem) => backendItem === item)
    )
  );

  return [
    line("Frontend", list(frontend)),
    line("Backend", list(backend)),
    line("CMS / Platforms", list(cms)),
    line("Tooling", list(tooling))
  ]
    .filter(Boolean)
    .join("\n");
}

function renderEarlyCareer(masterCv: MasterCv) {
  return [
    masterCv.early_career.date_range,
    masterCv.early_career.summary
  ]
    .filter(Boolean)
    .join("\n");
}

function renderBasics(masterCv: MasterCv) {
  return [
    masterCv.basics.full_name,
    masterCv.basics.title,
    line("Email", masterCv.basics.email),
    line("Phone", masterCv.basics.phone),
    line("Location", masterCv.basics.location),
    line("LinkedIn", masterCv.basics.linkedin),
    line("Website", masterCv.basics.website)
  ]
    .filter(Boolean)
    .join("\n");
}

function renderWorkExperience(masterCv: MasterCv) {
  return masterCv.work_experience
    .map((item) => {
      const dates = [item.start_date, item.current ? "Present" : item.end_date]
        .filter(Boolean)
        .join(" - ");
      const skills = [
        ...item.hard_skills,
        ...item.soft_skills,
        ...item.programming_languages,
        ...item.frameworks,
        ...item.cms,
        ...item.tools
      ];

      return [
        [item.title, item.company, dates].filter(Boolean).join(" | "),
        line("Location", item.location),
        line("Engagement", item.engagement_type),
        item.description,
        line("Skills", list(skills))
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function renderProjects(masterCv: MasterCv) {
  return masterCv.projects
    .map((project) =>
      [project.title, line("Client", project.client), project.description]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function renderEducation(masterCv: MasterCv) {
  return masterCv.education
    .map((item) =>
      [
        [item.degree, item.institution].filter(Boolean).join(" | "),
        line("Location", item.location),
        [item.start_date, item.end_date].filter(Boolean).join(" - ")
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function section(title: string, content: string) {
  return content ? `${title}\n${content}` : "";
}

function line(label: string, value: string) {
  return value ? `${label}: ${value}` : "";
}

function list(items: string[]) {
  return items.filter(Boolean).join(", ");
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}
