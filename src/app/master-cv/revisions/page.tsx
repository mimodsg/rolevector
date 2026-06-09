import { AppShell } from "@/components/app-shell";
import { RevisionActions } from "@/components/master-cv/revision-actions";
import { ButtonLink } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow
} from "@/components/ui/table";
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

export default async function MasterCvRevisionsPage() {
  const userId = await requireCurrentUserId();
  const revisionStore = prisma as typeof prisma & {
    masterCVRevision?: {
      findMany: (args: {
        orderBy: { revisionNumber: "desc" };
        where: { userId: string };
      }) => Promise<
        Array<{
          createdAt: Date;
          cvJson: { projects?: unknown[]; work_experience?: unknown[] };
          id: string;
          revisionNumber: number;
        }>
      >;
    };
  };

  const revisions = revisionStore.masterCVRevision
    ? await revisionStore.masterCVRevision.findMany({
        orderBy: { revisionNumber: "desc" },
        where: { userId }
      })
    : [];

  return (
    <AppShell
      actions={
        <ButtonLink href="/master-cv" variant="ghost">
          Back to master CV
        </ButtonLink>
      }
      title="Master CV Revisions"
    >
      <Panel className="overflow-hidden p-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeader>Revision</DataTableHeader>
              <DataTableHeader>Date</DataTableHeader>
              <DataTableHeader>Snapshot</DataTableHeader>
              <DataTableHeader>Operations</DataTableHeader>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {revisions.length === 0 ? (
              <DataTableRow>
                <DataTableCell className="text-rv-text-muted" colSpan={4}>
                  No Master CV revisions saved yet.
                </DataTableCell>
              </DataTableRow>
            ) : (
              revisions.map((revision) => {
                const cv = masterCvSchema.parse(revision.cvJson);
                const workExperienceCount = cv.work_experience.length;
                const projectCount = cv.projects.length;

                return (
                  <DataTableRow key={revision.id}>
                    <DataTableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-rv-text">
                          Revision {revision.revisionNumber}
                        </span>
                        <Tag>Master snapshot</Tag>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="text-rv-text-muted">
                      {formatDate(revision.createdAt)}
                    </DataTableCell>
                    <DataTableCell className="text-rv-text-muted">
                      {workExperienceCount} experience entries, {projectCount} projects
                    </DataTableCell>
                    <DataTableCell>
                      <RevisionActions id={revision.id} variant="master" />
                    </DataTableCell>
                  </DataTableRow>
                );
              })
            )}
          </DataTableBody>
        </DataTable>
      </Panel>
    </AppShell>
  );
}
