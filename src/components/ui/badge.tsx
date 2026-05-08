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
    neutral: "bg-rv-primary-soft text-rv-text-soft",
    admin: "bg-rv-highlight-soft text-rv-highlight",
    authenticated: "bg-rv-accent-soft text-rv-accent"
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
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
