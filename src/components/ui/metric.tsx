import type { ReactNode } from "react";

export function Metric({
  label,
  value
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-rvmd border border-rv-border bg-rv-bg p-4">
      <span className="block font-title text-4xl font-medium leading-none text-rv-highlight">
        {value}
      </span>
      <span className="text-xs font-bold text-rv-text-muted">{label}</span>
    </div>
  );
}
