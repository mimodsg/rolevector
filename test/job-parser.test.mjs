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
