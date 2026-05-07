import puppeteer from "puppeteer";
import type { MasterCv } from "@/lib/schemas/master-cv";
import { env } from "@/lib/env";

export function renderAtsHtml({
  cv,
  coverLetter
}: {
  cv: MasterCv;
  coverLetter?: string;
}) {
  const experience = cv.work_experience
    .map(
      (item) => `
        <section>
          <h3>${item.title} - ${item.company}</h3>
          <p>${item.start_date} - ${item.current ? "Present" : item.end_date}</p>
          <p>${item.description}</p>
          <ul>${item.achievements.map((achievement) => `<li>${achievement}</li>`).join("")}</ul>
        </section>
      `
    )
    .join("");

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
          .cover-letter { break-before: page; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>${cv.basics.full_name}</h1>
        <p class="contact">${cv.basics.title} | ${cv.basics.email} | ${cv.basics.phone} | ${cv.basics.location}</p>
        <h2>Professional Summary</h2>
        <p>${cv.summary}</p>
        <h2>Core Skills</h2>
        <p>${cv.core_skills.join(", ")}</p>
        <h2>Technical Skills</h2>
        <p>${[
          ...cv.technical_skills.languages,
          ...cv.technical_skills.frameworks,
          ...cv.technical_skills.cms,
          ...cv.technical_skills.tools
        ].join(", ")}</p>
        <h2>Work Experience</h2>
        ${experience}
        ${
          coverLetter
            ? `<section class="cover-letter"><h2>Cover Letter</h2>${coverLetter}</section>`
            : ""
        }
      </body>
    </html>
  `;
}

export async function renderPdfBuffer({
  cv,
  coverLetter
}: {
  cv: MasterCv;
  coverLetter?: string;
}) {
  const browser = await puppeteer.launch({
    executablePath: env.PUPPETEER_EXECUTABLE_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(renderAtsHtml({ cv, coverLetter }), {
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
