import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MasterCvSnapshotView } from "@/components/master-cv/master-cv-snapshot-view";
import { RevisionActions } from "@/components/master-cv/revision-actions";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
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

export default async function MasterCvRevisionPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireCurrentUserId();
  const { id } = await params;
  const revisionStore = prisma as typeof prisma & {
    masterCVRevision?: {
      findFirst: (args: {
        where: { id: string; userId: string };
      }) => Promise<{
        createdAt: Date;
        cvJson: unknown;
        id: string;
        revisionNumber: number;
      } | null>;
    };
  };

  if (!revisionStore.masterCVRevision) {
    notFound();
  }

  const revision = await revisionStore.masterCVRevision.findFirst({
    where: { id, userId }
  });

  if (!revision) {
    notFound();
  }

  return (
    <AppShell
      actions={
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/master-cv/revisions" variant="ghost">
            Back to revisions
          </ButtonLink>
          <ButtonLink href="/master-cv" variant="ghost">
            Back to master CV
          </ButtonLink>
        </div>
      }
      title={`Master CV Revision ${revision.revisionNumber}`}
    >
      <div className="grid gap-6">
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-bold text-rv-text">Saved {formatDate(revision.createdAt)}</p>
              <p className="mt-1 text-sm text-rv-text-muted">
                Review this snapshot before overriding the current Master CV.
              </p>
            </div>
            <RevisionActions id={revision.id} variant="master" />
          </div>
        </Panel>

        <MasterCvSnapshotView masterCv={masterCvSchema.parse(revision.cvJson)} />
      </div>
    </AppShell>
  );
}
