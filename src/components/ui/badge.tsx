import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TagTone = "neutral" | "admin" | "authenticated";

export function Tag({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: TagTone;
}) {
  const toneClass = {
    neutral: "bg-rv-primary-soft text-rv-primary-dark",
    admin: "bg-rv-accent-soft text-rv-accent",
    authenticated: "bg-rv-highlight-soft text-rv-highlight"
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-rvsm border border-current/20 px-2.5 py-1 text-xs font-bold",
        toneClass,
        className
      )}
      {...props}
    />
  );
}

export function RoleTag({
  role,
  className
}: {
  role: "Authenticated" | "Admin";
  className?: string;
}) {
  return (
    <Tag className={className} tone={role === "Admin" ? "admin" : "authenticated"}>
      {role === "Admin" ? "Admin" : "Authenticated"}
    </Tag>
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
    success: "bg-rv-accent-soft text-rv-accent",
    warning: "bg-rv-warning-soft text-rv-warning",
    error: "bg-rv-error-soft text-rv-error"
  }[tone];

  return (
    <div className={cn("rounded-rvmd border border-current/25 p-4 text-sm", toneClass, className)} {...props} />
  );
}
