import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MasterCvSnapshotView } from "@/components/master-cv/master-cv-snapshot-view";
import { RevisionActions } from "@/components/master-cv/revision-actions";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Tag } from "@/components/ui/badge";
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

export default async function OptimizedMasterCvRevisionPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireCurrentUserId();
  const { id } = await params;
  const revision = await prisma.optimizedMasterCV.findFirst({
    where: { id, userId }
  });

  if (!revision) {
    notFound();
  }

  return (
    <AppShell
      actions={
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/master-cv/optimized-revisions" variant="ghost">
            Back to optimized revisions
          </ButtonLink>
          <ButtonLink href="/master-cv" variant="ghost">
            Back to master CV
          </ButtonLink>
        </div>
      }
      title={`Optimized CV Revision ${revision.revisionNumber}`}
    >
      <div className="grid gap-6">
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-rv-text">Saved {formatDate(revision.createdAt)}</p>
                {revision.isMain ? <Tag>Main optimized</Tag> : null}
              </div>
              <p className="mt-1 text-sm text-rv-text-muted">
                Review this optimized snapshot before overriding the current Master CV.
              </p>
            </div>
            <RevisionActions
              id={revision.id}
              isCurrent={revision.isMain}
              variant="optimized"
            />
          </div>
        </Panel>

        <MasterCvSnapshotView masterCv={masterCvSchema.parse(revision.cvJson)} />
      </div>
    </AppShell>
  );
}
