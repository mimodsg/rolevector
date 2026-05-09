import type { MasterCv } from "@/lib/schemas/master-cv";

export function masterCvToOptimizationText(masterCv: MasterCv) {
  return [
    renderBasics(masterCv),
    section("Professional Summary", masterCv.summary),
    section("Hard Skills", list(masterCv.hard_skills)),
    section("Soft Skills", list(masterCv.soft_skills)),
    section(
      "Technical Skills",
      [
        line("Programming languages", list(masterCv.technical_skills.languages)),
        line("Frameworks", list(masterCv.technical_skills.frameworks)),
        line("CMS", list(masterCv.technical_skills.cms)),
        line("Tools", list(masterCv.technical_skills.tools))
      ]
        .filter(Boolean)
        .join("\n")
    ),
    section("Work Experience", renderWorkExperience(masterCv)),
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
