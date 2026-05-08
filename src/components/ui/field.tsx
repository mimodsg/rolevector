import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";
import { cn } from "@/lib/utils";

const control =
  "min-h-11 w-full rounded-rvmd border border-rv-border bg-rv-bg px-3.5 py-3 text-sm font-normal text-rv-text outline-none transition placeholder:text-rv-text-muted/70 focus:border-rv-highlight focus:ring-2 focus:ring-rv-highlight-soft";

export function Field({
  children,
  helper,
  label,
  htmlFor,
  className
}: {
  children: ReactNode;
  helper?: string;
  label: string;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-2 text-sm font-bold text-rv-text-soft", className)} htmlFor={htmlFor}>
      {label}
      {children}
      {helper ? <span className="text-xs font-normal text-rv-text-muted">{helper}</span> : null}
    </label>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

export function FileInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "cursor-pointer file:mr-3 file:rounded-rvmd file:border-0 file:bg-rv-primary-soft file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-rv-text", className)} type="file" {...props} />;
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(control, "min-h-32 resize-y leading-6", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, className)} {...props} />;
}
