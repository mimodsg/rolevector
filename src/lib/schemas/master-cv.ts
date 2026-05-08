import { z } from "zod";

const datedItemSchema = z.object({
  start_date: z.string().optional().default(""),
  end_date: z.string().optional().default("")
});

export const masterCvSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const cv = value as Record<string, unknown>;

  if (!("hard_skills" in cv) && "core_skills" in cv) {
    return {
      ...cv,
      hard_skills: cv.core_skills,
      soft_skills: cv.soft_skills ?? []
    };
  }

  return value;
}, z.object({
  basics: z.object({
    full_name: z.string().trim().min(1),
    title: z.string().trim().optional().default(""),
    email: z.string().trim().email(),
    phone: z.string().trim().optional().default(""),
    location: z.string().trim().optional().default(""),
    linkedin: z.string().trim().optional().default(""),
    website: z.string().trim().optional().default("")
  }),
  summary: z.string().trim().optional().default(""),
  hard_skills: z.array(z.string().trim()).default([]),
  soft_skills: z.array(z.string().trim()).default([]),
  technical_skills: z
    .object({
      languages: z.array(z.string().trim()).default([]),
      frameworks: z.array(z.string().trim()).default([]),
      cms: z.array(z.string().trim()).default([]),
      tools: z.array(z.string().trim()).default([])
    })
    .default({ languages: [], frameworks: [], cms: [], tools: [] }),
  work_experience: z
    .array(
      datedItemSchema.extend({
        company: z.string().trim().min(1),
        title: z.string().trim().min(1),
        location: z.string().trim().optional().default(""),
        engagement_type: z
          .enum(["", "full-time", "part-time", "project-based contract"])
          .default(""),
        current: z.boolean().default(false),
        description: z.string().trim().optional().default(""),
        hard_skills: z.array(z.string().trim()).default([]),
        soft_skills: z.array(z.string().trim()).default([]),
        programming_languages: z.array(z.string().trim()).default([]),
        frameworks: z.array(z.string().trim()).default([]),
        cms: z.array(z.string().trim()).default([]),
        tools: z.array(z.string().trim()).default([])
      })
    )
    .default([]),
  projects: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().optional().default(""),
        technologies: z.array(z.string().trim()).default([])
      })
    )
    .default([]),
  education: z
    .array(
      datedItemSchema.extend({
        institution: z.string().trim().min(1),
        degree: z.string().trim().optional().default(""),
        location: z.string().trim().optional().default("")
      })
    )
    .default([]),
  certifications: z.array(z.string().trim()).default([]),
  languages: z.array(z.string().trim()).default([]),
  hidden_context: z
    .object({
      additional_experience: z.array(z.string().trim()).default([]),
      keywords: z.array(z.string().trim()).default([])
    })
    .default({ additional_experience: [], keywords: [] })
}));

export type MasterCv = z.infer<typeof masterCvSchema>;
