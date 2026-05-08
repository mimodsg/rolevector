import Link from "next/link";
import { getServerSession } from "next-auth";
import type { ReactNode } from "react";
import { authOptions } from "@/lib/auth";
import { appShellStyles as styles } from "./styles";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/master-cv", label: "Master CV" },
  { href: "/cover-letter", label: "Cover Letter" },
  { href: "/applications", label: "Applications" },
  { href: "/optimize", label: "Optimize" }
];

type AppShellProps = {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
};

export async function AppShell({ children, title, actions }: AppShellProps) {
  const session = await getServerSession(authOptions);
  const visibleNavItems =
    session?.user.role === "Admin"
      ? [...navItems, { href: "/admin/users", label: "Users" }]
      : navItems;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/dashboard">
            RoleVector
          </Link>
          <nav className={styles.nav}>
            {visibleNavItems.map((item) => (
              <Link className={styles.navLink} href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <section className={styles.content}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          {actions}
        </div>
        {children}
      </section>
    </main>
  );
}
