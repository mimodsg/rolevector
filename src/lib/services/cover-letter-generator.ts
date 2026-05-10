import { renderCoverLetterTemplate } from "@/lib/cover-letter-template";
import type { ParsedJob } from "@/lib/schemas/job";
import type { MasterCv } from "@/lib/schemas/master-cv";

export function generateCoverLetter({
  masterCv,
  parsedJob,
  template
}: {
  masterCv: MasterCv;
  parsedJob: ParsedJob;
  template?: string;
}) {
  if (template?.trim()) {
    return renderCoverLetterTemplate({
      masterCv,
      parsedJob,
      template
    });
  }

  return [
    "Dear hiring team,",
    "",
    `I am excited to apply for ${parsedJob.position_title ?? "the role"} at ${parsedJob.company_name ?? "your team"}. My background aligns with the requirements you described, especially around ${masterCv.hard_skills.slice(0, 4).join(", ") || "the requested experience"}.`,
    "",
    "I would welcome the opportunity to discuss how my experience can support your hiring goals.",
    "",
    "Sincerely,",
    masterCv.basics.full_name
  ].join("\n");
}
