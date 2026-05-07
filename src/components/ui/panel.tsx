import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  as,
  className,
  elevated = false,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  elevated?: boolean;
}) {
  const Component = as ?? "section";

  return (
    <Component
      className={cn(
        "rounded-rvlg border border-rv-border bg-[linear-gradient(145deg,var(--color-surface),#393535)] p-5 shadow-rvsm",
        elevated && "shadow-rvmd",
        className
      )}
      {...props}
    />
  );
}
