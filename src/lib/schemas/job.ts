import { z } from "zod";

const optionalUrlSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.union([z.string().url("Enter a valid URL."), z.literal("")]).optional().default("")
);

export const jobDescriptionSchema = z.object({
  company: z.string().trim().min(1, "Enter the company name."),
  companyUrl: optionalUrlSchema,
  jobDetails: z.string().trim().min(50, "Paste the full job details."),
  jobApplicationUrl: optionalUrlSchema,
  positionTitle: z.string().trim().min(1, "Enter the position title."),
  salary: z.string().trim().optional().default("")
});

export const parsedJobSchema = z.object({
  company_name: z.string().nullable().default(null),
  position_title: z.string().nullable().default(null),
  salary: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  seniority: z.string().nullable().default(null),
  required_skills: z.array(z.string()).default([]),
  preferred_skills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  constraint_clauses: z.array(z.string()).default([]),
  alternative_requirement_groups: z
    .array(
      z.object({
        items: z.array(z.string()).default([]),
        mode: z.enum(["any_of"]).default("any_of"),
        source_section: z.string().default("")
      })
    )
    .default([])
});

export type ParsedJob = z.infer<typeof parsedJobSchema>;
