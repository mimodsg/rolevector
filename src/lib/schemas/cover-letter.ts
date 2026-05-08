import { z } from "zod";

export const coverLetterTemplateSchema = z.object({
  content: z.string().trim().default("")
});

export type CoverLetterTemplateInput = z.infer<typeof coverLetterTemplateSchema>;
