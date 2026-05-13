import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Eyebrow({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-rvsm border border-rv-primary bg-rv-primary-soft px-3 py-1 font-title text-sm font-medium uppercase text-rv-primary-dark",
        className
      )}
      {...props}
    />
  );
}

export function PageTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & {
  children: ReactNode;
}) {
  return (
    <h1
      className={cn(
        "font-title text-4xl font-medium uppercase text-rv-text md:text-5xl",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export function SectionTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & {
  children: ReactNode;
}) {
  return (
    <h2
      className={cn(
        "font-title text-2xl font-medium uppercase text-rv-text md:text-3xl",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export function Subtitle({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "font-title text-xl font-light uppercase text-rv-text-muted",
        className
      )}
      {...props}
    />
  );
}

export function HelperText({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement | HTMLSpanElement>) {
  return (
    <p className={cn("text-sm text-rv-text-muted", className)} {...props} />
  );
}
