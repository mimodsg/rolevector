import { z } from "zod";

export const jobDescriptionSchema = z.object({
  company: z.string().trim().min(1, "Enter the company name."),
  jobDetails: z.string().trim().min(50, "Paste the full job details."),
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
  keywords: z.array(z.string()).default([])
});

export type ParsedJob = z.infer<typeof parsedJobSchema>;
