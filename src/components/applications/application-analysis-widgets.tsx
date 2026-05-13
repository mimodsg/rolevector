import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type {
  ApplicationAnalysisSnapshot,
  KeywordInsight,
  SectionAnalysis
} from "@/lib/services/application-analysis";

type ScoreRingProps = {
  afterScore?: number | null;
  beforeScore?: number;
  label?: string;
  score: number;
};

export function ScoreRing({
  afterScore,
  beforeScore,
  label,
  score
}: ScoreRingProps) {
  const primaryProgress = `${Math.max(0, Math.min(100, score))}%`;
  const beforeProgress = `${Math.max(0, Math.min(100, beforeScore ?? score))}%`;
  const afterProgress = `${Math.max(0, Math.min(100, afterScore ?? score))}%`;
  const style = {
    "--after-score": afterProgress,
    "--before-score": beforeProgress,
    "--score": primaryProgress
  } as CSSProperties;
  const background =
    typeof afterScore === "number"
      ? "radial-gradient(circle at center,var(--color-surface) 0 52%,transparent 53%),conic-gradient(var(--color-success) 0 var(--after-score),var(--color-primary) var(--after-score) var(--before-score),rgba(100,116,139,0.3) var(--before-score) 100%)"
      : "radial-gradient(circle at center,var(--color-surface) 0 52%,transparent 53%),conic-gradient(var(--color-primary) 0 var(--score),rgba(100,116,139,0.3) var(--score) 100%)";

  return (
    <div
      className="grid size-28 shrink-0 place-items-center rounded-full"
      style={{ ...style, background }}
    >
      <div className="grid text-center">
        <span className="font-title text-4xl font-medium leading-none text-rv-text">
          {score}
        </span>
        {label ? (
          <span className="mt-1 text-xs font-bold text-rv-accent">{label}</span>
        ) : null}
      </div>
    </div>
  );
}

export function OverviewScoreBand({
  isOptimized,
  snapshot
}: {
  isOptimized: boolean;
  snapshot: ApplicationAnalysisSnapshot;
}) {
  const afterScore = isOptimized ? snapshot.scores.afterAts : null;
  const headline = isOptimized ? "Optimized match" : "Baseline match";

  return (
    <section className="grid overflow-hidden rounded-rvlg border border-rv-border bg-[linear-gradient(145deg,var(--color-surface),rgba(11,16,32,0.72))] shadow-rvsm lg:grid-cols-[1.45fr_repeat(3,minmax(0,1fr))]">
      <div className="border-b border-rv-border p-5 lg:border-b-0 lg:border-r">
        <span className="font-title text-xs font-medium uppercase tracking-wide text-rv-text-muted">
          Overall Score
        </span>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <ScoreRing
            afterScore={afterScore}
            beforeScore={snapshot.scores.beforeAts}
            label={isOptimized ? "After" : "Before"}
            score={snapshot.scores.overall}
          />
          <div className="max-w-sm">
            <strong className="text-rv-text">{headline}</strong>
            <p className="mt-2 text-sm leading-6 text-rv-text-muted">
              {snapshot.summary}
            </p>
          </div>
        </div>
      </div>
      <OverviewMetric
        helper="Matched and missing role keywords from the job input."
        label="Keyword Match"
        value={`${snapshot.scores.keywordMatch}%`}
      />
      <OverviewMetric
        helper="Structure and parsing compatibility for ATS systems."
        label="ATS Compatibility"
        value={`${snapshot.scores.atsCompatibility}%`}
      />
      <OverviewMetric
        helper="Recruiter readability, role fit, and positioning quality."
        label="Human Screener Score"
        value={`${snapshot.scores.humanScreener}%`}
      />
    </section>
  );
}

export function OverviewMetric({
  helper,
  label,
  value
}: {
  helper: string;
  label: string;
  value: string;
}) {
  const numericValue = Number(value.replace("%", "")) || 0;

  return (
    <div className="border-b border-rv-border p-5 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
      <span className="font-title text-xs font-medium uppercase tracking-wide text-rv-text-muted">
        {label}
      </span>
      <span className="mt-4 block font-title text-4xl font-medium text-rv-text">
        {value}
      </span>
      <ProgressBar value={numericValue} />
      <p className="mt-3 text-xs leading-5 text-rv-text-muted">{helper}</p>
    </div>
  );
}

export function ProgressBar({
  tone = "success",
  value
}: {
  tone?: "success" | "warning";
  value: number;
}) {
  return (
    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-rv-surface-alt">
      <span
        className={cn(
          "block h-full rounded-full",
          tone === "warning" ? "bg-rv-warning" : "bg-rv-accent"
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function AnalysisPanel({
  children,
  title
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <article className="rounded-rvlg border border-rv-border bg-[linear-gradient(145deg,var(--color-surface),rgba(11,16,32,0.68))] p-5 shadow-rvsm">
      <h2 className="font-title text-xl font-medium uppercase text-rv-text">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </article>
  );
}

export function MatchBreakdown({
  snapshot
}: {
  snapshot: ApplicationAnalysisSnapshot;
}) {
  const rows = [
    ["Skills", snapshot.scores.skills],
    ["Experience", snapshot.scores.experience],
    ["Education", snapshot.scores.education],
    ["Keywords", snapshot.scores.keywords],
    ["Formatting", snapshot.scores.formatting]
  ] as const;

  return (
    <div className="grid gap-4">
      {rows.map(([label, score]) => (
        <div
          className="grid gap-3 text-sm md:grid-cols-[120px_minmax(0,1fr)_44px] md:items-center"
          key={label}
        >
          <span className="text-rv-text-soft">{label}</span>
          <ProgressBar tone={score < 75 ? "warning" : "success"} value={score} />
          <strong className="text-rv-text">{score}%</strong>
        </div>
      ))}
    </div>
  );
}

export function KeywordList({ keywords }: { keywords: KeywordInsight[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {keywords.length === 0 ? (
        <p className="text-sm text-rv-text-muted">No keyword signals available.</p>
      ) : (
        keywords.map((keyword) => (
          <span
            className={cn(
              "inline-flex min-h-8 items-center rounded-rvsm border px-3 py-1 text-xs font-bold",
              keyword.status === "matched"
                ? "border-rv-accent bg-rv-accent-soft text-rv-accent"
                : "border-rv-warning bg-rv-warning-soft text-rv-warning"
            )}
            key={`${keyword.status}-${keyword.label}`}
          >
            {keyword.label}
          </span>
        ))
      )}
    </div>
  );
}

export function SectionScoreGrid({ sections }: { sections: SectionAnalysis[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {sections.map((section) => (
        <div
          className="grid justify-items-center rounded-rvmd border border-rv-border bg-rv-bg p-4 text-center"
          key={section.label}
        >
          <span className="font-title text-xs font-medium uppercase tracking-wide text-rv-text">
            {section.label}
          </span>
          <MiniRing score={section.score} />
          <span className="text-xs font-semibold text-rv-text-muted">
            {section.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniRing({ score }: { score: number }) {
  const tone = score < 75 ? "var(--color-warning)" : "var(--color-success)";
  const background =
    "radial-gradient(circle at center,var(--color-surface) 0 52%,transparent 53%),conic-gradient(var(--ring-color) 0 var(--ring-progress),rgba(100,116,139,0.3) var(--ring-progress) 100%)";

  return (
    <span
      className="my-3 grid size-20 place-items-center rounded-full font-bold text-rv-text"
      style={
        {
          "--ring-color": tone,
          "--ring-progress": `${score}%`,
          background
        } as CSSProperties
      }
    >
      {score}%
    </span>
  );
}
