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

  assert.ok(result.fitScore >= 7.5, `expected strong fit, got ${result.fitScore}`);
  assert.equal(result.generationDecision, "ALLOW");
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

test("multi-word soft-skill phrases from the master CV count as matched core requirements", () => {
  const result = assessApplicationFit({
    masterCv: {
      ...baseCv,
      soft_skills: [
        "Mentoring",
        "Communication",
        "Problem Solving",
        "Project Management",
        "Process Improvement",
        "Team Leadership",
        "Strategic Planning",
        "Adaptability"
      ]
    },
    parsedJob: {
      company_name: "OpsCo",
      position_title: "Operations Manager",
      salary: null,
      location: "Remote",
      seniority: "senior",
      required_skills: [
        "Problem Solving",
        "Project Management",
        "Process Improvement",
        "Team Leadership",
        "Strategic Planning",
        "Adaptability"
      ],
      preferred_skills: [],
      responsibilities: [
        "Oversee daily operations and ensure project milestones are met",
        "Collaborate across departments to streamline workflows",
        "Provide strategic insights to senior leadership"
      ],
      keywords: ["Operations", "Project Management", "Team Leadership"]
    }
  });

  assert.deepEqual(
    [...result.coreRequirementsMissing].sort(),
    [],
    `expected no missing phrase-based soft-skill requirements, got ${result.coreRequirementsMissing.join(", ")}`
  );
  assert.ok(
    result.coreRequirementsMatched.includes("Project Management"),
    "expected phrase-level soft skill to count as a matched core requirement"
  );
});

test("low overall fit without true blockers allows generation with warning", () => {
  const result = assessApplicationFit({
    masterCv: baseCv,
    parsedJob: {
      company_name: "GeneralCo",
      position_title: "Operations Coordinator",
      salary: null,
      location: "Remote",
      seniority: "mid",
      required_skills: ["Operations", "Process Improvement", "Strategic Planning"],
      preferred_skills: ["Project Management"],
      responsibilities: [
        "Coordinate internal workflows and support reporting",
        "Collaborate across teams on process improvements"
      ],
      keywords: ["Operations", "Reporting", "Coordination"]
    }
  });

  assert.notEqual(
    result.generationDecision,
    "BLOCK",
    `expected warning path instead of block, got ${result.generationDecision}`
  );
});

test("high-confidence constraint blockers still block generation", () => {
  const result = assessApplicationFit({
    masterCv: baseCv,
    parsedJob: {
      company_name: "ClearanceCo",
      position_title: "Program Specialist",
      salary: null,
      location: "On-site",
      seniority: "senior",
      required_skills: ["Active security clearance", "US citizen", "Project Management"],
      preferred_skills: [],
      responsibilities: [
        "Support regulated program delivery on-site",
        "Coordinate reporting with government stakeholders"
      ],
      keywords: ["Security Clearance", "US Citizen", "On-site"]
    }
  });

  assert.equal(result.generationDecision, "BLOCK");
});

test("alternative requirement groups do not require every listed option", () => {
  const result = assessApplicationFit({
    masterCv: baseCv,
    parsedJob: {
      company_name: "TrainingCo",
      position_title: "Web Developer",
      salary: null,
      location: "Remote",
      seniority: "mid",
      required_skills: ["Python", "Java", "JavaScript", "TypeScript", "C++", "Swift", "Rust"],
      preferred_skills: ["Full stack", "Backend", "Frontend", "Mobile"],
      responsibilities: [
        "Review and evaluate code written by AI models",
        "Write coding challenges to test AI capabilities",
        "Identify bugs and provide structured feedback"
      ],
      keywords: ["Software Engineering", "JavaScript", "TypeScript", "Remote"],
      constraint_clauses: [
        "Candidates must be legally authorised to work in one of the listed Latin America locations"
      ],
      alternative_requirement_groups: [
        {
          items: ["Python", "Java", "JavaScript", "TypeScript", "C++", "Swift", "Rust"],
          mode: "any_of",
          source_section: "required_skills"
        }
      ]
    }
  });

  assert.notEqual(
    result.generationDecision,
    "BLOCK",
    `expected alternative language group to avoid blocking, got ${result.generationDecision}`
  );
  assert.ok(
    !result.coreRequirementsMissing.includes("Python") ||
      !result.coreRequirementsMissing.includes("Java"),
    `expected satisfied alternative group not to mark every sibling as missing: ${result.coreRequirementsMissing.join(", ")}`
  );
});
