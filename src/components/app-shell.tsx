import Link from "next/link";
import type { ReactNode } from "react";

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
    <main className="min-h-screen bg-[#f5f7fb] text-[#172033]">
      <header className="border-b border-[#d9deea] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <Link className="text-lg font-semibold" href="/dashboard">
            RoleVector
          </Link>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                className="rounded-md px-3 py-2 text-sm font-medium text-[#4d5b6f] hover:bg-[#eef2f7] hover:text-[#172033]"
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
          <h1 className="text-3xl font-semibold">{title}</h1>
          {actions}
        </div>
        {children}
      </section>
    </main>
  );
}
