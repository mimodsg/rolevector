import puppeteer from "puppeteer";
import type { MasterCv } from "@/lib/schemas/master-cv";
import { env } from "@/lib/env";

export function renderCvHtml(cv: MasterCv) {
  const experience = cv.work_experience
    .map(
      (item) => `
        <section>
          <h3>${escapeHtml(item.title)} - ${escapeHtml(item.company)}</h3>
          <p>${escapeHtml(item.start_date)} - ${escapeHtml(item.current ? "Present" : item.end_date)}</p>
          <p>${escapeHtml(item.description)}</p>
          <p>${escapeHtml(
            [
              ...item.hard_skills,
              ...item.soft_skills,
              ...item.programming_languages,
              ...item.frameworks,
              ...item.cms,
              ...item.tools
            ].join(", ")
          )}</p>
        </section>
      `
    )
    .join("");
  const earlyCareer = cv.early_career.summary
    ? `
        <h2>Early Career</h2>
        <section>
          <h3>${escapeHtml(cv.early_career.date_range)}</h3>
          <p>${escapeHtml(cv.early_career.summary)}</p>
        </section>
      `
    : "";
  const education = cv.education
    .map((item) => {
      const dates = [item.start_date, item.end_date].filter(Boolean).join(" - ");

      return `
        <section>
          <h3>${escapeHtml([item.degree, item.institution].filter(Boolean).join(" - "))}</h3>
          <p>${escapeHtml([item.location, dates].filter(Boolean).join(" | "))}</p>
        </section>
      `;
    })
    .join("");
  const technicalSkillGroups = renderTechnicalSkillGroups(cv);

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { color: #111827; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.45; margin: 32px; }
          h1, h2, h3, p { margin: 0 0 8px; }
          h1 { font-size: 24px; }
          h2 { border-bottom: 1px solid #d1d5db; font-size: 15px; margin-top: 18px; padding-bottom: 4px; }
          ul { margin: 0 0 10px 18px; padding: 0; }
          section { margin-bottom: 12px; }
          .contact { color: #374151; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(cv.basics.full_name)}</h1>
        <p class="contact">${escapeHtml(cv.basics.title)} | ${escapeHtml(cv.basics.email)} | ${escapeHtml(cv.basics.phone)} | ${escapeHtml(cv.basics.location)}</p>
        <h2>Professional Summary</h2>
        <p>${escapeHtml(cv.summary)}</p>
        ${cv.frontend_expertise.length ? `<h2>Frontend Expertise</h2><p>${escapeHtml(cv.frontend_expertise.join(", "))}</p>` : ""}
        <h2>Hard Skills</h2>
        <p>${escapeHtml(cv.hard_skills.join(", "))}</p>
        <h2>Soft Skills</h2>
        <p>${escapeHtml(cv.soft_skills.join(", "))}</p>
        <h2>Technical Skills</h2>
        ${technicalSkillGroups}
        <h2>Work Experience</h2>
        ${experience}
        ${earlyCareer}
        ${education ? `<h2>Education</h2>${education}` : ""}
        ${cv.certifications.length ? `<h2>Certifications</h2><p>${escapeHtml(cv.certifications.join(", "))}</p>` : ""}
        ${cv.languages.length ? `<h2>Languages</h2><p>${escapeHtml(cv.languages.join(", "))}</p>` : ""}
      </body>
    </html>
  `;
}

function renderTechnicalSkillGroups(cv: MasterCv) {
  const frontend = unique([
    ...cv.frontend_expertise,
    ...cv.technical_skills.languages.filter((item) => /javascript|typescript/i.test(item)),
    ...cv.technical_skills.frameworks.filter((item) =>
      /react|next|tailwind|storybook|styled|sass|scss/i.test(item)
    )
  ]);
  const backend = unique(
    [
      ...cv.hard_skills,
      ...cv.technical_skills.languages,
      ...cv.technical_skills.frameworks,
      ...cv.technical_skills.tools
    ].filter((item) =>
      /node|api|rest|graphql|php|\.net|c#|postgres|sql|prisma|backend/i.test(item)
    )
  );
  const tooling = unique(
    cv.technical_skills.tools.filter(
      (item) => !backend.some((backendItem) => backendItem === item)
    )
  );
  const groups: Array<[string, string[]]> = [
    ["Frontend", frontend],
    ["Backend", backend],
    ["CMS / Platforms", cv.technical_skills.cms],
    ["Tooling", tooling]
  ];

  return groups
    .filter((group) => group[1].length > 0)
    .map(
      ([label, items]) =>
        `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(items.join(", "))}</p>`
    )
    .join("");
}

export function renderCoverLetterHtml(coverLetter: string) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { color: #111827; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.55; margin: 32px; white-space: pre-wrap; }
          p { margin: 0; }
        </style>
      </head>
      <body>
        <p>${escapeHtml(coverLetter)}</p>
      </body>
    </html>
  `;
}

export async function renderPdfBuffer(html: string) {
  const browser = await puppeteer.launch({
    executablePath: env.PUPPETEER_EXECUTABLE_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0"
    });

    return await page.pdf({
      format: "Letter",
      printBackground: false,
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in"
      }
    });
  } finally {
    await browser.close();
  }
}

export async function renderCvPdfBuffer(cv: MasterCv) {
  return renderPdfBuffer(renderCvHtml(cv));
}

export async function renderCoverLetterPdfBuffer(coverLetter: string) {
  return renderPdfBuffer(renderCoverLetterHtml(coverLetter));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}
