import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  action,
  className,
  description,
  title,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        "rounded-rvmd border border-dashed border-rv-border bg-rv-bg/60 p-6 text-center",
        className
      )}
      {...props}
    >
      <h3 className="font-title text-xl uppercase text-rv-highlight">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-rv-text-muted">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
