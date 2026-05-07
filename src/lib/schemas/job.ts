import { z } from "zod";

export const jobDescriptionSchema = z.object({
  jobDescription: z.string().trim().min(50, "Paste the full job description.")
});

export const parsedJobSchema = z.object({
  company_name: z.string().nullable().default(null),
  position_title: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  seniority: z.string().nullable().default(null),
  required_skills: z.array(z.string()).default([]),
  preferred_skills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([])
});

export type ParsedJob = z.infer<typeof parsedJobSchema>;
