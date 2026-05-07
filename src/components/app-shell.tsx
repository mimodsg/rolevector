import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow, PageTitle } from "@/components/ui/typography";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/master-cv", label: "Master CV" },
  { href: "/applications", label: "Applications" },
  { href: "/optimize", label: "Optimize" }
];

export function AppShell({
  children,
  title,
  actions
}: {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <main className="min-h-screen text-rv-text">
      <header className="border-b border-rv-border bg-rv-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <Link className="font-title text-2xl font-medium uppercase text-rv-highlight" href="/dashboard">
            RoleVector
          </Link>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                className="rounded-rvmd px-3 py-2 text-sm font-bold text-rv-text-muted hover:bg-rv-primary-soft hover:text-rv-text"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Eyebrow>Workspace</Eyebrow>
            <PageTitle className="mt-3">{title}</PageTitle>
          </div>
          {actions ?? (
            <ButtonLink href="/optimize" variant="ghost">
              Optimize
            </ButtonLink>
          )}
        </div>
        {children}
      </section>
    </main>
  );
}
