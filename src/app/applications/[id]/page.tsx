import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ApplicationStatusSelect } from "@/components/applications/application-status-select";
import { OptimizeApplicationButton } from "@/components/applications/optimize-application-button";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ScoreCard } from "@/components/ui/score-card";
import { masterCvToOptimizationText } from "@/lib/master-cv-text";
import { prisma } from "@/lib/prisma";
import { masterCvSchema } from "@/lib/schemas/master-cv";
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

  const optimizedCvText =
    application.optimizedCvText ||
    masterCvToOptimizationText(masterCvSchema.parse(application.optimizedCvJson));

  return (
    <AppShell
      actions={
        <div className="flex flex-wrap gap-3">
          <OptimizeApplicationButton applicationId={application.id} />
          <ButtonLink href={`/api/applications/${application.id}/pdf`} variant="highlight">
            Download PDF
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
            <dl className="mt-6 grid gap-4 text-sm md:grid-cols-3">
              <div>
                <dt className="font-bold text-rv-text-soft">Application date</dt>
                <dd className="mt-1 text-rv-text-muted">{formatDate(application.createdAt)}</dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">Salary</dt>
                <dd className="mt-1 text-rv-text-muted">{application.salary || "-"}</dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">ATS score</dt>
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
            <h2 className="font-title text-xl uppercase text-rv-text">Cover Letter</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-rv-text-muted">
              {application.coverLetterText}
            </p>
          </Panel>
        </div>

        <aside className="grid content-start gap-6">
          <ScoreCard
            score={application.atsScore.toFixed(1)}
            summary="Snapshot generated from your Master CV and the pasted job opening."
          />
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
