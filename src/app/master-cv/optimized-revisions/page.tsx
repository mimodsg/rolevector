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
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/server/session";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export default async function OptimizedMasterCvRevisionsPage() {
  const userId = await requireCurrentUserId();
  const revisions = await prisma.optimizedMasterCV.findMany({
    orderBy: [{ isMain: "desc" }, { revisionNumber: "desc" }],
    where: { userId }
  });

  return (
    <AppShell
      actions={
        <ButtonLink href="/master-cv" variant="ghost">
          Back to master CV
        </ButtonLink>
      }
      title="Optimized CV Revisions"
    >
      <Panel className="overflow-hidden p-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeader>Revision</DataTableHeader>
              <DataTableHeader>Date</DataTableHeader>
              <DataTableHeader>Status</DataTableHeader>
              <DataTableHeader>Operations</DataTableHeader>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {revisions.length === 0 ? (
              <DataTableRow>
                <DataTableCell className="text-rv-text-muted" colSpan={4}>
                  No optimized CV revisions saved yet.
                </DataTableCell>
              </DataTableRow>
            ) : (
              revisions.map((revision) => {
                const cvJson = revision.cvJson as {
                  projects?: unknown[];
                  work_experience?: unknown[];
                };
                const workExperienceCount = Array.isArray(cvJson.work_experience)
                  ? cvJson.work_experience.length
                  : 0;
                const projectCount = Array.isArray(cvJson.projects) ? cvJson.projects.length : 0;

                return (
                  <DataTableRow key={revision.id}>
                    <DataTableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-rv-text">
                          Revision {revision.revisionNumber}
                        </span>
                        {revision.isMain ? <Tag>Main optimized</Tag> : <Tag>Revision</Tag>}
                      </div>
                    </DataTableCell>
                    <DataTableCell className="text-rv-text-muted">
                      {formatDate(revision.createdAt)}
                    </DataTableCell>
                    <DataTableCell className="text-rv-text-muted">
                      {workExperienceCount} experience entries, {projectCount} projects
                    </DataTableCell>
                    <DataTableCell>
                      <RevisionActions
                        id={revision.id}
                        isCurrent={revision.isMain}
                        variant="optimized"
                      />
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
