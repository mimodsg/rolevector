import type { ApplicationStatusValue } from "@/lib/schemas/application";

const styles: Record<ApplicationStatusValue, string> = {
  Draft: "bg-rv-primary-soft text-rv-text-soft",
  Applied: "bg-rv-accent-soft text-rv-accent",
  Interviewing: "bg-rv-highlight-soft text-rv-highlight",
  Rejected: "bg-rv-error-soft text-rv-error",
  Offer: "bg-rv-highlight text-rv-bg"
};

export function StatusPill({ status }: { status: ApplicationStatusValue }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}
