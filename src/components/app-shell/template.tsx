import Link from "next/link";
import type { ReactNode } from "react";
import { appShellStyles as styles } from "./styles";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/master-cv", label: "Master CV" },
  { href: "/applications", label: "Applications" },
  { href: "/optimize", label: "Optimize" }
];

type AppShellProps = {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
};

export function AppShell({ children, title, actions }: AppShellProps) {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/dashboard">
            RoleVector
          </Link>
          <nav className={styles.nav}>
            {navItems.map((item) => (
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
