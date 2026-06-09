import { AppShell } from "@/components/app-shell";
import { OptimizedMasterCvWorkbench } from "@/components/master-cv/optimized-master-cv-workbench";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { masterCvRecordToMasterCv } from "@/lib/master-cv";
import { masterCvRevisionRecordToMasterCvRevision } from "@/lib/master-cv-revision";
import { optimizedMasterCvRecordToOptimizedMasterCv } from "@/lib/optimized-master-cv";
import { prisma } from "@/lib/prisma";
import {
  isMissingTableError,
  optimizedMasterCvMigrationMessage
} from "@/lib/server/prisma-errors";
import { requireCurrentUserId } from "@/lib/server/session";

export default async function OptimizeMasterCvPage() {
  const userId = await requireCurrentUserId();
  try {
    const revisionStore = prisma as typeof prisma & {
      masterCVRevision?: {
        findMany: (args: {
          orderBy: { revisionNumber: "desc" };
          where: { userId: string };
        }) => Promise<
          Array<{
            id: string;
            sourceMasterCvId: string;
            revisionNumber: number;
            cvJson: unknown;
            createdAt: Date;
          }>
        >;
      };
    };

    const [masterCvRecord, masterCvRevisions, optimizedMasterCvs] = await Promise.all([
      prisma.masterCV.findUnique({
        where: { userId },
        include: {
          workExperiences: {
            orderBy: { sortOrder: "asc" }
          },
          projects: {
            orderBy: { sortOrder: "asc" }
          },
          educationEntries: {
            orderBy: { sortOrder: "asc" }
          }
        }
      }),
      revisionStore.masterCVRevision
        ? revisionStore.masterCVRevision.findMany({
            orderBy: { revisionNumber: "desc" },
            where: { userId }
          })
        : Promise.resolve([]),
      prisma.optimizedMasterCV.findMany({
        orderBy: [{ isMain: "desc" }, { revisionNumber: "desc" }],
        where: { userId }
      })
    ]);

    const masterCv = masterCvRecord ? masterCvRecordToMasterCv(masterCvRecord) : null;

    return (
      <AppShell
        actions={
          <ButtonLink href="/master-cv" variant="ghost">
            Back to master CV
          </ButtonLink>
        }
        title="Optimize Master CV"
      >
        <OptimizedMasterCvWorkbench
          masterCv={masterCv}
          masterCvRevisions={masterCvRevisions.map(masterCvRevisionRecordToMasterCvRevision)}
          optimizedMasterCvs={optimizedMasterCvs.map(optimizedMasterCvRecordToOptimizedMasterCv)}
          suggestions={null}
        />
      </AppShell>
    );
  } catch (error) {
    if (
      !isMissingTableError(error, "optimized_master_cvs") &&
      !isMissingTableError(error, "master_cv_revisions")
    ) {
      throw error;
    }

    return (
      <AppShell
        actions={
          <ButtonLink href="/master-cv" variant="ghost">
            Back to master CV
          </ButtonLink>
        }
        title="Optimize Master CV"
      >
        <EmptyState
          description={optimizedMasterCvMigrationMessage()}
          title="Migration Required"
        />
      </AppShell>
    );
  }
}
