import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "highlight" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-rv-primary text-rv-text hover:bg-rv-primary-dark",
  secondary: "border-transparent bg-rv-accent text-rv-bg hover:bg-rv-highlight",
  highlight: "border-transparent bg-rv-highlight text-rv-bg hover:bg-rv-accent",
  ghost: "border-rv-border bg-transparent text-rv-text hover:bg-rv-primary-soft"
};

const base =
  "inline-flex min-h-11 items-center justify-center rounded-rvmd border px-4 py-2.5 text-sm font-bold no-underline transition focus:outline-none focus:ring-2 focus:ring-rv-highlight-soft disabled:cursor-not-allowed disabled:opacity-60";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button className={cn(base, variants[variant], className)} {...props} />
  );
}

export function ButtonLink({
  children,
  className,
  variant = "primary",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
}) {
  return (
    <Link className={cn(base, variants[variant], className)} {...props}>
      {children}
    </Link>
  );
}
