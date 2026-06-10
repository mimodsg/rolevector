import test from "node:test";
import assert from "node:assert/strict";
import { parseJobDescription } from "../src/lib/services/job-parser.ts";

const masterCv = {
  basics: {
    full_name: "Alex Example",
    title: "Senior Frontend Engineer",
    email: "alex@example.com",
    phone: "",
    location: "",
    linkedin: "",
    website: ""
  },
  summary: "",
  frontend_expertise: ["React", "Next.js"],
  hard_skills: ["TypeScript", "GraphQL"],
  soft_skills: [],
  technical_skills: {
    languages: ["TypeScript", "JavaScript"],
    frameworks: ["React", "Next.js"],
    cms: ["Drupal"],
    tools: ["Figma", "Prisma"]
  },
  work_experience: [],
  early_career: { date_range: "", summary: "" },
  projects: [],
  education: [],
  certifications: [],
  languages: [],
  hidden_context: {
    additional_experience: [],
    keywords: ["CMS"]
  }
};

test("job parser separates required, preferred, and ATS keywords with better precision", () => {
  const parsed = parseJobDescription({
    company: "ExampleCo",
    masterCv,
    positionTitle: "Senior Frontend Engineer",
    salary: "",
    jobDetails: `
Responsibilities:
- Build accessible React and Next.js interfaces with TypeScript
- Collaborate with design on design systems and component libraries

Required Qualifications:
- 5+ years experience with React, Next.js, TypeScript, GraphQL, and Figma
- Experience building CMS-backed web platforms

Preferred Qualifications:
- Drupal experience
- Prisma is a plus

Location: Remote
`
  });

  assert.deepEqual([...parsed.required_skills].sort(), [
    "CMS",
    "Figma",
    "GraphQL",
    "Next.js",
    "React",
    "TypeScript"
  ]);
  assert.deepEqual([...parsed.preferred_skills].sort(), ["Drupal", "Prisma"]);
  assert.ok(parsed.keywords.includes("Design Systems"));
  assert.ok(parsed.keywords.includes("CMS"));
  assert.equal(parsed.seniority, "Senior");
  assert.equal(parsed.location, "Location: Remote");
});

test("job parser avoids dumping generic uppercase words into keywords", () => {
  const parsed = parseJobDescription({
    company: "InfraCorp",
    masterCv,
    positionTitle: "Principal Backend Engineer",
    salary: "",
    jobDetails: `
What You'll Do:
- Design backend services and API integrations
- Lead architecture reviews across the platform team

Must Have:
- Kubernetes, Docker, Linux, PostgreSQL, Node.js

Nice to Have:
- Rancher

Our COMPANY builds PRODUCTS for ENTERPRISE teams.
`
  });

  assert.deepEqual([...parsed.required_skills].sort(), [
    "Docker",
    "Kubernetes",
    "Linux",
    "Node.js",
    "PostgreSQL"
  ]);
  assert.deepEqual(parsed.preferred_skills, ["Rancher"]);
  assert.ok(!parsed.keywords.includes("COMPANY"));
  assert.ok(!parsed.keywords.includes("PRODUCTS"));
  assert.ok(parsed.keywords.includes("Backend"));
  assert.ok(parsed.keywords.includes("API"));
});

test("job parser captures inline and paragraph-style requirement content", () => {
  const parsed = parseJobDescription({
    company: "",
    masterCv,
    positionTitle: "",
    salary: "",
    jobDetails: `
Senior Drupal Developer
Requirements: Drupal, PHP, JavaScript, content management systems, and stakeholder collaboration.
Preferred Qualifications: Shopify and GraphQL.
Responsibilities: Build and maintain CMS experiences. Collaborate with stakeholders and support content platform improvements.
`
  });

  assert.ok(parsed.position_title?.includes("Drupal Developer"));
  assert.ok(parsed.required_skills.includes("Drupal"));
  assert.ok(parsed.required_skills.includes("JavaScript"));
  assert.ok(parsed.required_skills.includes("CMS"));
  assert.ok(parsed.preferred_skills.includes("Shopify"));
  assert.ok(parsed.preferred_skills.includes("GraphQL"));
  assert.ok(parsed.responsibilities.length > 0);
});

test("job parser extracts useful required skills from paragraph qualifications", () => {
  const parsed = parseJobDescription({
    company: "",
    masterCv,
    positionTitle: "",
    salary: "",
    jobDetails: `
Senior Software Engineer

Qualifications
The ideal candidate will possess a strong background in software engineering with a minimum of 5 years of professional experience in related fields. Proficiency in multiple programming languages such as C, C++, Python, or similar is essential, along with experience working on Linux, Windows, and embedded platforms. Familiarity with software development lifecycle processes, version control systems, and agile methodologies is expected.

Responsibilities
Designing, implementing, and maintaining high-quality software solutions for autonomous systems.
`
  });

  assert.ok(parsed.required_skills.includes("C++"));
  assert.ok(parsed.required_skills.includes("Python"));
  assert.ok(parsed.required_skills.includes("Linux"));
  assert.ok(parsed.required_skills.includes("Windows"));
  assert.ok(parsed.required_skills.includes("Version Control Systems"));
  assert.ok(parsed.required_skills.includes("Agile Methodologies"));
  assert.ok(parsed.required_skills.length >= 5);
});

test("job parser ignores benefits boilerplate and captures desired skills as requirements", () => {
  const parsed = parseJobDescription({
    company: "Beladed Inc",
    masterCv,
    positionTitle: "Operations Manager",
    salary: "",
    jobDetails: `
Responsibilities
In this role, you will be responsible for overseeing daily operations, ensuring project milestones are met, and maintaining high standards of quality. You will collaborate closely with various departments to streamline processes, optimize workflows, and implement best practices. Your duties will include analyzing performance metrics, preparing reports, and providing strategic insights to senior management.

Benefits
Beladed Inc offers a comprehensive benefits package designed to support our employees' well-being and professional development.

Equal Opportunity
Beladed Inc is an equal opportunity employer. We celebrate diversity and are committed to creating an inclusive environment for all employees.

Desired Skills and Experience
Project Management, Operations, Team Leadership, Process Improvement, Strategic Planning, Communication
`
  });

  assert.ok(parsed.required_skills.includes("Project Management"));
  assert.ok(parsed.required_skills.includes("Operations"));
  assert.ok(parsed.required_skills.includes("Team Leadership"));
  assert.ok(parsed.required_skills.includes("Process Improvement"));
  assert.ok(parsed.required_skills.includes("Strategic Planning"));
  assert.ok(parsed.required_skills.includes("Communication"));
  assert.equal(parsed.responsibilities.length, 1);
  assert.ok(!parsed.responsibilities.some((item) => /benefits|equal opportunity/i.test(item)));
});
