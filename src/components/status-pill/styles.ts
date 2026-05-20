import type { ApplicationStatusValue } from "@/lib/schemas/application";

export const statusPillStyles = {
  base: "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
  variants: {
    Draft: "bg-rv-primary-soft text-rv-text-soft",
    Applied: "bg-rv-highlight-soft text-rv-highlight",
    Interviewing: "bg-rv-accent-soft text-rv-accent",
    Dropped: "bg-rv-warning-soft text-rv-warning",
    Rejected: "bg-rv-error-soft text-rv-error",
    Offer: "bg-rv-highlight text-rv-bg"
  } satisfies Record<ApplicationStatusValue, string>
};
