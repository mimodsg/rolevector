import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ApplicationStatusSelect } from "@/components/applications/application-status-select";
import { OptimizeApplicationButton } from "@/components/applications/optimize-application-button";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ScoreCard } from "@/components/ui/score-card";
import { masterCvToOptimizationText } from "@/lib/master-cv-text";
import { masterCvSchema } from "@/lib/schemas/master-cv";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/server/session";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export default async function ApplicationPreviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireCurrentUserId();
  const { id } = await params;
  const application = await prisma.application.findFirst({
    where: { id, userId }
  });

  if (!application) {
    notFound();
  }

  const cv = masterCvSchema.parse(application.optimizedCvJson);
  const optimizedCvText =
    application.optimizedCvText || masterCvToOptimizationText(cv);
  const scoreDelta = Number(
    (application.atsScore - application.baselineAtsScore).toFixed(1)
  );
  const isOptimized = Boolean(application.optimizedAt);

  return (
    <AppShell
      actions={
        <div className="flex flex-wrap gap-3">
          {isOptimized ? null : (
            <OptimizeApplicationButton applicationId={application.id} />
          )}
          <ButtonLink href={`/api/applications/${application.id}/pdf`} variant="highlight">
            Download PDFs
          </ButtonLink>
        </div>
      }
      title="Application Preview"
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-title text-2xl uppercase text-rv-highlight">
                  {application.positionTitle ?? "Untitled position"}
                </h2>
                <p className="mt-2 text-rv-text-muted">
                  {application.companyName ?? "Unknown company"}
                </p>
              </div>
              <div className="min-w-48">
                <ApplicationStatusSelect
                  applicationId={application.id}
                  initialStatus={application.status}
                />
              </div>
            </div>
            <dl className="mt-6 grid gap-4 text-sm md:grid-cols-4">
              <div>
                <dt className="font-bold text-rv-text-soft">Application date</dt>
                <dd className="mt-1 text-rv-text-muted">{formatDate(application.createdAt)}</dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">Salary</dt>
                <dd className="mt-1 text-rv-text-muted">{application.salary || "-"}</dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">Before score</dt>
                <dd className="mt-1 text-rv-text-muted">
                  {application.baselineAtsScore.toFixed(1)}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">Current score</dt>
                <dd className="mt-1 text-rv-text-muted">{application.atsScore.toFixed(1)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel>
            <h2 className="font-title text-xl uppercase text-rv-text">Optimized CV</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-rv-text-muted">
              {optimizedCvText}
            </p>
          </Panel>

          <Panel>
            <p className="whitespace-pre-wrap text-sm leading-6 text-rv-text-muted">
              {application.coverLetterText}
            </p>
          </Panel>
        </div>

        <aside className="grid content-start gap-6">
          <ScoreCard
            score={application.atsScore.toFixed(1)}
            summary={
              isOptimized
                ? `Optimized from ${application.baselineAtsScore.toFixed(1)} to ${application.atsScore.toFixed(1)} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta}).`
                : "Baseline snapshot from your Master CV. Run optimization from this preview."
            }
          />
          <Panel>
            <h2 className="font-title text-xl uppercase text-rv-text">Score Comparison</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-bold text-rv-text-soft">Before optimization</dt>
                <dd className="mt-1 text-rv-text-muted">
                  {application.baselineAtsScore.toFixed(1)}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">After optimization</dt>
                <dd className="mt-1 text-rv-text-muted">
                  {isOptimized ? application.atsScore.toFixed(1) : "Not optimized yet"}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">Difference</dt>
                <dd className="mt-1 text-rv-text-muted">
                  {isOptimized ? `${scoreDelta >= 0 ? "+" : ""}${scoreDelta}` : "-"}
                </dd>
              </div>
            </dl>
          </Panel>
          <Panel>
            <h2 className="font-title text-xl uppercase text-rv-text">Job Details</h2>
            <p className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap text-sm leading-6 text-rv-text-muted">
              {application.jobDetails}
            </p>
          </Panel>
        </aside>
      </section>
    </AppShell>
  );
}
