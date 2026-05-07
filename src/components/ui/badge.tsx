import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Tag({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-rv-primary-soft px-2.5 py-1 text-xs font-bold text-rv-text-soft",
        className
      )}
      {...props}
    />
  );
}

export function Alert({
  className,
  tone = "success",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: "success" | "warning" | "error";
}) {
  const toneClass = {
    success: "bg-rv-highlight-soft text-rv-highlight",
    warning: "bg-rv-accent-soft text-rv-accent",
    error: "bg-rv-error-soft text-rv-error"
  }[tone];

  return (
    <div
      className={cn("rounded-rvmd p-4 text-sm", toneClass, className)}
      {...props}
    />
  );
}
