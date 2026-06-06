import test from "node:test";
import assert from "node:assert/strict";
import { assessApplicationFit } from "../src/lib/services/application-fit.ts";

const baseCv = {
  basics: {
    full_name: "Alex Example",
    title: "Senior Frontend Engineer",
    email: "alex@example.com",
    phone: "",
    location: "Remote, Guayaquil, Ecuador",
    linkedin: "",
    website: ""
  },
  summary:
    "Senior frontend engineer building React and Next.js applications with TypeScript, accessibility, and CMS experience.",
  frontend_expertise: ["React", "Next.js", "Accessibility", "Responsive Design"],
  hard_skills: ["TypeScript", "JavaScript", "GraphQL", "REST"],
  soft_skills: ["Mentoring", "Communication"],
  technical_skills: {
    languages: ["TypeScript", "JavaScript"],
    frameworks: ["React", "Next.js"],
    cms: ["Drupal"],
    tools: ["Figma", "JIRA", "SiteImprove"]
  },
  work_experience: [
    {
      company: "Acme",
      title: "Senior Frontend Engineer",
      location: "Remote",
      engagement_type: "full-time",
      start_date: "2022",
      end_date: "",
      current: true,
      description:
        "Built accessible React and Next.js platforms, collaborated with design, and delivered CMS-backed web experiences.",
      hard_skills: ["Accessibility", "REST"],
      soft_skills: ["Mentoring"],
      programming_languages: ["TypeScript", "JavaScript"],
      frameworks: ["React", "Next.js"],
      cms: ["Drupal"],
      tools: ["JIRA", "SiteImprove"]
    }
  ],
  early_career: { date_range: "", summary: "" },
  projects: [
    {
      title: "Marketing Platform",
      description: "React and Next.js delivery for a CMS-backed web platform.",
      client: "Acme"
    }
  ],
  education: [],
  certifications: [],
  languages: ["English"],
  hidden_context: {
    additional_experience: [],
    keywords: ["React", "Next.js", "TypeScript", "Accessibility", "Drupal"]
  }
};

test("strong but credible alignment no longer inflates into the high 9s", () => {
  const result = assessApplicationFit({
    masterCv: baseCv,
    parsedJob: {
      company_name: "ExampleCo",
      position_title: "Senior Frontend Engineer",
      salary: null,
      location: "Remote",
      seniority: "senior",
      required_skills: ["React", "Next.js", "TypeScript", "Accessibility"],
      preferred_skills: ["Drupal"],
      responsibilities: [
        "Build accessible React interfaces with TypeScript",
        "Collaborate with design and product teams",
        "Support CMS-backed web experiences"
      ],
      keywords: ["React", "Next.js", "TypeScript", "Accessibility", "CMS", "Frontend"]
    }
  });

  assert.ok(result.fitScore >= 7, `expected strong fit, got ${result.fitScore}`);
  assert.ok(result.fitScore < 9.5, `expected less inflation, got ${result.fitScore}`);
});

test("clear stack mismatch scores as low fit", () => {
  const result = assessApplicationFit({
    masterCv: baseCv,
    parsedJob: {
      company_name: "InfraCorp",
      position_title: "Principal Backend Engineer",
      salary: null,
      location: "Hybrid",
      seniority: "principal",
      required_skills: ["Kubernetes", "Docker", "Linux", "PostgreSQL", "Node.js"],
      preferred_skills: ["Rancher"],
      responsibilities: [
        "Design backend services and APIs",
        "Own container orchestration and infrastructure automation",
        "Lead principal-level backend architecture decisions"
      ],
      keywords: ["Kubernetes", "Docker", "Linux", "PostgreSQL", "Node.js", "Backend"]
    }
  });

  assert.ok(result.fitScore < 5, `expected low fit, got ${result.fitScore}`);
  assert.equal(result.decision, "Explore another opportunity");
});

test("full hard-requirement alignment now reads as a strong fit", () => {
  const result = assessApplicationFit({
    masterCv: baseCv,
    parsedJob: {
      company_name: "ProductCo",
      position_title: "Senior Frontend Engineer",
      salary: null,
      location: "Remote",
      seniority: "senior",
      required_skills: ["React", "TypeScript", "GraphQL", "Figma"],
      preferred_skills: ["Drupal", "Prisma"],
      responsibilities: [
        "Build React experiences with TypeScript and GraphQL",
        "Collaborate closely with design using Figma",
        "Support CMS-backed web delivery"
      ],
      keywords: ["React", "GraphQL", "TypeScript", "Figma", "Frontend", "CMS"]
    }
  });

  assert.ok(result.fitScore >= 8, `expected strong fit, got ${result.fitScore}`);
});

test("specialized CMS roles are not crushed by one unsupported secondary platform", () => {
  const result = assessApplicationFit({
    masterCv: baseCv,
    parsedJob: {
      company_name: "CommerceCo",
      position_title: "Drupal Developer",
      salary: null,
      location: "Remote",
      seniority: "senior",
      required_skills: ["Drupal", "Shopify"],
      preferred_skills: [],
      responsibilities: [
        "Build and maintain Drupal sites",
        "Support CMS implementations",
        "Collaborate with stakeholders on content platform improvements"
      ],
      keywords: ["Drupal", "Shopify", "CMS"]
    }
  });

  assert.ok(
    result.fitScore >= 5,
    `expected this mixed-platform CMS role to remain viable, got ${result.fitScore}`
  );
  assert.notEqual(result.decision, "Explore another opportunity");
});
