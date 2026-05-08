import { createRequire } from "node:module";
import { masterCvSchema, type MasterCv } from "@/lib/schemas/master-cv";

const require = createRequire(import.meta.url);

type PdfParseModule = {
  PDFParse: new (options: { data: Buffer }) => {
    destroy: () => Promise<void>;
    getText: () => Promise<{ text: string }>;
  };
};

type PdfCanvasModule = {
  DOMMatrix: typeof DOMMatrix;
  DOMPoint: typeof DOMPoint;
  DOMRect: typeof DOMRect;
  ImageData: typeof ImageData;
  Path2D: typeof Path2D;
};

const SECTION_HEADINGS = [
  "experience",
  "work experience",
  "professional experience",
  "employment",
  "projects",
  "education",
  "skills",
  "technical skills",
  "certifications",
  "languages"
];

export async function extractMasterCvText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    ensurePdfRuntimeGlobals();
    const { PDFParse } = require("pdf-parse") as PdfParseModule;
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  return buffer.toString("utf8");
}

function ensurePdfRuntimeGlobals() {
  const canvas = require("@napi-rs/canvas") as PdfCanvasModule;

  globalThis.DOMMatrix ??= canvas.DOMMatrix;
  globalThis.DOMPoint ??= canvas.DOMPoint;
  globalThis.DOMRect ??= canvas.DOMRect;
  globalThis.ImageData ??= canvas.ImageData;
  globalThis.Path2D ??= canvas.Path2D;
}

export function parseMasterCvText({
  fallbackEmail,
  fallbackName,
  text
}: {
  fallbackEmail: string;
  fallbackName: string;
  text: string;
}): MasterCv {
  const normalizedText = text.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const email = normalizedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = normalizedText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim();
  const urls = [...normalizedText.matchAll(/https?:\/\/[^\s)]+|www\.[^\s)]+/gi)].map(
    (match) => match[0]
  );
  const linkedin = urls.find((url) => url.toLowerCase().includes("linkedin")) ?? "";
  const website = urls.find((url) => !url.toLowerCase().includes("linkedin")) ?? "";
  const firstContentLine =
    lines.find((line) => !line.includes("@") && !urls.includes(line) && line.length <= 90) ??
    fallbackName;
  const secondContentLine = lines.find(
    (line) => line !== firstContentLine && line.length <= 100 && !line.includes("@")
  );

  const skillsText =
    sectionText(normalizedText, ["skills", "technical skills", "technologies"]) ?? "";
  const educationText = sectionText(normalizedText, ["education"]) ?? "";
  const projectsText = sectionText(normalizedText, ["projects"]) ?? "";
  const experienceText =
    sectionText(normalizedText, [
      "experience",
      "work experience",
      "professional experience",
      "employment"
    ]) ?? "";
  const certificationText = sectionText(normalizedText, ["certifications"]) ?? "";
  const languagesText = sectionText(normalizedText, ["languages"]) ?? "";

  return masterCvSchema.parse({
    basics: {
      full_name: firstContentLine || fallbackName,
      title: secondContentLine ?? "",
      email: email ?? fallbackEmail,
      phone: phone ?? "",
      location: "",
      linkedin,
      website
    },
    summary: summaryFromText(normalizedText),
    hard_skills: parseList(skillsText).slice(0, 30),
    soft_skills: parseList(skillsText, [
      "communication",
      "leadership",
      "collaboration",
      "teamwork",
      "problem",
      "mentoring",
      "ownership",
      "adaptability",
      "stakeholder"
    ]).slice(0, 20),
    technical_skills: {
      languages: parseList(skillsText, ["typescript", "javascript", "php", "python", "sql"]),
      frameworks: parseList(skillsText, ["next", "react", "node", "laravel", "drupal"]),
      cms: parseList(skillsText, ["wordpress", "drupal", "contentful", "sanity"]),
      tools: parseList(skillsText, ["prisma", "postgres", "git", "figma", "docker", "lando"])
    },
    work_experience: parseExperience(experienceText),
    projects: parseProjects(projectsText),
    education: parseEducation(educationText),
    certifications: parseList(certificationText),
    languages: parseList(languagesText),
    hidden_context: {
      additional_experience: [],
      keywords: parseList(skillsText).slice(0, 50)
    }
  });
}

function sectionText(text: string, names: string[]) {
  const headingPattern = names.map(escapeRegExp).join("|");
  const nextHeadingPattern = SECTION_HEADINGS.map(escapeRegExp).join("|");
  const match = text.match(
    new RegExp(
      `(?:^|\\n)\\s*(?:${headingPattern})\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:${nextHeadingPattern})\\s*:?\\s*\\n|$)`,
      "i"
    )
  );

  return match?.[1]?.trim();
}

function summaryFromText(text: string) {
  const explicitSummary = sectionText(text, ["summary", "profile", "professional summary"]);

  if (explicitSummary) {
    return explicitSummary.split("\n\n")[0].slice(0, 1200).trim();
  }

  return text
    .split("\n\n")
    .find((paragraph) => paragraph.length > 80)
    ?.slice(0, 1200)
    .trim() ?? "";
}

function parseList(text: string, preferredIncludes?: string[]) {
  const values = text
    .split(/\n|,|;|•|·|\|/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter((item) => item.length > 1 && item.length < 80);

  const unique = [...new Set(values)];

  if (!preferredIncludes) {
    return unique;
  }

  return unique.filter((item) =>
    preferredIncludes.some((needle) => item.toLowerCase().includes(needle))
  );
}

function parseExperience(text: string) {
  return chunkEntries(text)
    .map((chunk) => {
      const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
      const titleLine = lines[0] ?? "";
      const companyLine = lines[1] ?? "";

      if (!titleLine || !companyLine) {
        return null;
      }

      return {
        company: companyLine,
        title: titleLine,
        location: "",
        engagement_type: "",
        start_date: "",
        end_date: "",
        current: /present|current/i.test(chunk),
        description: lines.slice(2).join("\n").slice(0, 1500),
        hard_skills: [],
        soft_skills: [],
        programming_languages: [],
        frameworks: [],
        cms: [],
        tools: []
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 12);
}

function parseProjects(text: string) {
  return chunkEntries(text)
    .map((chunk) => {
      const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
      const title = lines[0] ?? "";

      if (!title) {
        return null;
      }

      return {
        title,
        description: lines.slice(1).join("\n").slice(0, 1200),
        client: ""
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 12);
}

function parseEducation(text: string) {
  return chunkEntries(text)
    .map((chunk) => {
      const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
      const institution = lines[0] ?? "";

      if (!institution) {
        return null;
      }

      return {
        institution,
        degree: lines[1] ?? "",
        location: "",
        start_date: "",
        end_date: ""
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 8);
}

function chunkEntries(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
