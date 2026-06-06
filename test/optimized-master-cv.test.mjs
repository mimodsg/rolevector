import test from "node:test";
import assert from "node:assert/strict";
import {
  applyOptimizedMasterCvSuggestions,
  generateOptimizedMasterCvSuggestions
} from "../src/lib/services/optimized-master-cv.ts";

function buildMasterCv() {
  return {
    basics: {
      full_name: "Alex Example",
      title: "Senior Fullstack Engineer",
      email: "alex@example.com",
      phone: "",
      location: "",
      linkedin: "",
      website: ""
    },
    summary: "Builder of product experiences.",
    frontend_expertise: [],
    hard_skills: ["GraphQL", "Leadership"],
    soft_skills: ["Communication"],
    technical_skills: {
      languages: ["TypeScript"],
      frameworks: ["Next.js"],
      cms: [],
      tools: ["Figma"]
    },
    work_experience: [
      {
        company: "Acme",
        title: "Senior Engineer",
        location: "Remote",
        engagement_type: "full-time",
        start_date: "2023-01",
        end_date: "",
        current: true,
        description: "Led the frontend platform.",
        hard_skills: ["GraphQL"],
        soft_skills: ["Communication"],
        programming_languages: ["TypeScript"],
        frameworks: ["React", "Next.js"],
        cms: [],
        tools: ["Figma", "Storybook"]
      }
    ],
    early_career: {
      date_range: "",
      summary: ""
    },
    projects: [
      {
        title: "Design system refresh",
        description: "",
        client: "Acme"
      }
    ],
    education: [],
    certifications: [],
    languages: [],
    hidden_context: {
      additional_experience: [],
      keywords: []
    }
  };
}

test("generates add/remove skill suggestions and editorial updates from current CV evidence", () => {
  const suggestions = generateOptimizedMasterCvSuggestions(buildMasterCv());

  assert.equal(
    suggestions.skillsMissing.some(
      (suggestion) =>
        suggestion.type === "add_skill" &&
        suggestion.skill === "React" &&
        suggestion.bucket === "technical_skills.frameworks"
    ),
    true
  );
  assert.equal(
    suggestions.skillsMissing.some(
      (suggestion) =>
        suggestion.type === "add_skill" &&
        suggestion.skill === "Storybook" &&
        suggestion.bucket === "technical_skills.tools"
    ),
    true
  );
  assert.equal(
    suggestions.skillsToRemove.some(
      (suggestion) =>
        suggestion.type === "remove_skill" && suggestion.skill === "Leadership"
    ),
    true
  );
  assert.equal(suggestions.editorialUpdates.length > 0, true);
});

test("applies selected optimization suggestions into a new master CV snapshot", () => {
  const masterCv = buildMasterCv();
  const suggestions = generateOptimizedMasterCvSuggestions(masterCv);
  const selectedSuggestionIds = [
    suggestions.skillsMissing.find((suggestion) => suggestion.skill === "React")?.id,
    suggestions.skillsToRemove.find((suggestion) => suggestion.skill === "Leadership")?.id,
    suggestions.editorialUpdates[0]?.id
  ].filter(Boolean);
  const optimized = applyOptimizedMasterCvSuggestions({
    masterCv,
    selectedSuggestionIds,
    suggestions
  });

  assert.equal(optimized.technical_skills.frameworks.includes("React"), true);
  assert.equal(optimized.hard_skills.includes("Leadership"), false);
  assert.notEqual(optimized.work_experience[0]?.description, masterCv.work_experience[0]?.description);
});
