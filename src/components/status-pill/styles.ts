import type { ApplicationStatusValue } from "@/lib/schemas/application";

export const statusPillStyles = {
  base: "inline-flex rounded-rvsm border border-current/20 px-2.5 py-1 text-xs font-bold",
  variants: {
    Draft: "bg-rv-primary-soft text-rv-text-soft",
    Applied: "bg-rv-accent-soft text-rv-accent",
    Interviewing: "bg-rv-highlight-soft text-rv-highlight",
    Rejected: "bg-rv-error-soft text-rv-error",
    Offer: "bg-rv-accent text-rv-bg"
  } satisfies Record<ApplicationStatusValue, string>
};
