import Link from "next/link";
import { homeLandingStyles as styles } from "./styles";

const workflow = [
  "Build a truthful master CV",
  "Paste a job description",
  "Generate an ATS-safe application",
  "Track score and history"
];

const modules = [
  "Authentication and session management",
  "Master CV CRUD with structured JSON",
  "OpenAI parsing and optimization services",
  "Application history with ATS score tracking",
  "Puppeteer PDF export from ATS-safe templates"
];

export function HomeLanding() {
  return (
    <main className={styles.main}>
      <section className={styles.container}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>RoleVector</p>
          <div className={styles.heroRow}>
            <div className={styles.heroCopy}>
              <h1 className={styles.title}>ATS CV optimizer</h1>
              <p className={styles.subtitle}>
                Local-first workspace for maintaining a master CV, generating
                tailored applications, and preserving each generated snapshot.
              </p>
            </div>
            <Link className={styles.primaryLink} href="/dashboard">
              Open workspace
            </Link>
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
          <form className={styles.panel}>
            <label className={styles.label} htmlFor="job-description-input">
              Job description
            </label>
            <textarea
              className={styles.textarea}
              id="job-description-input"
              placeholder="Paste the role description here..."
            />
            <div className={styles.buttonRow}>
              <button className={styles.primaryButton} type="button">
                Optimize CV for Position
              </button>
              <button className={styles.secondaryButton} type="button">
                Save draft
              </button>
            </div>
          </form>

          <aside className={styles.panel}>
            <h2 className={styles.asideTitle}>MVP modules</h2>
            <ul className={styles.moduleList}>
              {modules.map((module) => (
                <li key={module}>{module}</li>
              ))}
            </ul>
          </aside>
        </section>
      </section>
    </main>
  );
}
