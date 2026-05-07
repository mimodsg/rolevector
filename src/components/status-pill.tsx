import type { ApplicationStatusValue } from "@/lib/schemas/application";

const styles: Record<ApplicationStatusValue, string> = {
  Draft: "bg-[#eef2f7] text-[#334155]",
  Applied: "bg-[#e0f2fe] text-[#075985]",
  Interviewing: "bg-[#dcfce7] text-[#166534]",
  Rejected: "bg-[#fee2e2] text-[#991b1b]",
  Offer: "bg-[#fef3c7] text-[#92400e]"
};

export function StatusPill({ status }: { status: ApplicationStatusValue }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}
