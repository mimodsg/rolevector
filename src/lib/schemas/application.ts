import { z } from "zod";
import { jobDescriptionSchema } from "./job";

export const applicationStatusSchema = z.enum([
  "Draft",
  "Applied",
  "Interviewing",
  "Rejected",
  "Offer"
]);

export const createApplicationSchema = jobDescriptionSchema;

export const updateApplicationSchema = z.object({
  status: applicationStatusSchema
});

export type ApplicationStatusValue = z.infer<typeof applicationStatusSchema>;
