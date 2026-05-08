import Link from "next/link";
import { homeLandingStyles as styles } from "./styles";

const workflow = [
  "Create and maintain a structured master CV",
  "Tailor applications against job descriptions",
  "Track generated applications and ATS signals"
];

const highlights = [
  "Role-based access for authenticated users and admins",
  "Normalized CV data stored in database columns",
  "Application history with generated CV snapshots"
];

export function HomeLanding() {
  return (
    <main className={styles.main}>
      <section className={styles.container}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>RoleVector</p>
          <div className={styles.hero}>
            <div className={styles.heroCopy}>
              <h1 className={styles.title}>Welcome to RoleVector</h1>
              <p className={styles.subtitle}>
                A focused workspace for building a reusable master CV, generating
                job-specific applications, and keeping each result organized for
                follow-up.
              </p>
            </div>
            <div className={styles.actionRow}>
              <Link className={styles.primaryLink} href="/login">
                Login
              </Link>
              <Link className={styles.secondaryLink} href="/register">
                Register
              </Link>
            </div>
          </div>
        </header>

        <div className={styles.workflowGrid}>
          {workflow.map((item, index) => (
            <div className={styles.workflowCard} key={item}>
              <p className={styles.workflowNumber}>
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className={styles.workflowText}>{item}</p>
            </div>
          ))}
        </div>

        <section className={styles.contentGrid}>
          <article className={styles.panel}>
            <h2 className={styles.panelTitle}>What the app does</h2>
            <p className={styles.bodyText}>
              RoleVector helps authenticated users keep one reliable source of
              truth for their experience, then use that source to generate
              tailored job applications. Admins can manage access for the team
              from the user area.
            </p>
          </article>

          <aside className={styles.panel}>
            <h2 className={styles.panelTitle}>Included</h2>
            <ul className={styles.moduleList}>
              {highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </aside>
        </section>
      </section>
    </main>
  );
}
