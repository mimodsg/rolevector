import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { ButtonLink } from "@/components/ui/button";
import { Metric } from "@/components/ui/metric";
import { Panel } from "@/components/ui/panel";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/server/session";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatScore(score: number | null) {
  return score === null ? "-" : score.toFixed(1);
}

export default async function DashboardPage() {
  const userId = await requireCurrentUserId();
  const [applicationCount, averageScore, interviewingCount, offerCount, recentApplications] =
    await Promise.all([
      prisma.application.count({
        where: { userId }
      }),
      prisma.application.aggregate({
        _avg: { atsScore: true },
        where: { userId }
      }),
      prisma.application.count({
        where: { status: "Interviewing", userId }
      }),
      prisma.application.count({
        where: { status: "Offer", userId }
      }),
      prisma.application.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        where: { userId }
      })
    ]);
  const metrics = [
    { label: "Applications", value: applicationCount },
    { label: "Average ATS score", value: formatScore(averageScore._avg.atsScore) },
    { label: "Interviews", value: interviewingCount },
    { label: "Offers", value: offerCount }
  ];

  return (
    <AppShell
      actions={
        <ButtonLink href="/applications/new">
          New application
        </ButtonLink>
      }
      title="Dashboard"
    >
      <div className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => (
          <Metric key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </div>
      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-title text-xl uppercase text-rv-text">
            Recent applications
          </h2>
        </div>
        <div className="mt-4">
          <DataTable>
            <DataTableHead>
              <DataTableRow className="border-t-0 hover:bg-transparent">
                <DataTableHeader>Position</DataTableHeader>
                <DataTableHeader>Company</DataTableHeader>
                <DataTableHeader>Score</DataTableHeader>
                <DataTableHeader>Date</DataTableHeader>
                <DataTableHeader>Status</DataTableHeader>
                <DataTableHeader>Actions</DataTableHeader>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {recentApplications.length === 0 ? (
                <DataTableRow>
                  <DataTableCell className="text-rv-text-muted" colSpan={6}>
                    No applications yet.
                  </DataTableCell>
                </DataTableRow>
              ) : (
                recentApplications.map((application) => (
                  <DataTableRow key={application.id}>
                    <DataTableCell className="text-rv-text">
                      {application.positionTitle ?? "Untitled position"}
                    </DataTableCell>
                    <DataTableCell className="text-rv-text-muted">
                      {application.companyName ?? "Unknown company"}
                    </DataTableCell>
                    <DataTableCell className="text-rv-text-muted">
                      {application.atsScore.toFixed(1)}
                    </DataTableCell>
                    <DataTableCell className="text-rv-text-muted">
                      {formatDate(application.createdAt)}
                    </DataTableCell>
                    <DataTableCell>
                      <StatusPill status={application.status} />
                    </DataTableCell>
                    <DataTableCell>
                      <ButtonLink href={`/applications/${application.id}`} variant="ghost">
                        Preview
                      </ButtonLink>
                    </DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </div>
      </Panel>
    </AppShell>
  );
}
