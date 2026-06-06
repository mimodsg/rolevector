import { AppShell } from "@/components/app-shell";
import { OptimizedMasterCvWorkbench } from "@/components/master-cv/optimized-master-cv-workbench";
import { ButtonLink } from "@/components/ui/button";
import { masterCvRecordToMasterCv } from "@/lib/master-cv";
import { optimizedMasterCvRecordToOptimizedMasterCv } from "@/lib/optimized-master-cv";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/server/session";
import { generateOptimizedMasterCvSuggestions } from "@/lib/services/optimized-master-cv";

export default async function OptimizeMasterCvPage() {
  const userId = await requireCurrentUserId();
  const [masterCvRecord, optimizedMasterCvs] = await Promise.all([
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
    prisma.optimizedMasterCV.findMany({
      orderBy: [{ isMain: "desc" }, { revisionNumber: "desc" }],
      where: { userId }
    })
  ]);

  const masterCv = masterCvRecord ? masterCvRecordToMasterCv(masterCvRecord) : null;
  const suggestions = masterCv ? generateOptimizedMasterCvSuggestions(masterCv) : null;

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
        optimizedMasterCvs={optimizedMasterCvs.map(optimizedMasterCvRecordToOptimizedMasterCv)}
        suggestions={suggestions}
      />
    </AppShell>
  );
}
