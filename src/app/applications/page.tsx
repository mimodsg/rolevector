import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/server/session";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export default async function ApplicationsPage() {
  const userId = await requireCurrentUserId();
  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  return (
    <AppShell title="Applications">
      <Panel className="overflow-hidden p-0">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-rv-bg text-rv-text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Position</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Salary</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td className="px-4 py-5 text-rv-text-muted" colSpan={6}>
                  No generated applications yet.
                </td>
              </tr>
            ) : (
              applications.map((application) => (
                <tr className="border-t border-rv-border" key={application.id}>
                  <td className="px-4 py-3 text-rv-text">
                    {application.positionTitle ?? "Untitled position"}
                  </td>
                  <td className="px-4 py-3 text-rv-text-muted">
                    {application.companyName ?? "Unknown company"}
                  </td>
                  <td className="px-4 py-3 text-rv-text-muted">
                    {application.salary || "-"}
                  </td>
                  <td className="px-4 py-3 text-rv-text-muted">
                    {formatDate(application.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={application.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <ButtonLink href={`/applications/${application.id}`} variant="ghost">
                        Preview
                      </ButtonLink>
                      <ButtonLink href={`/api/applications/${application.id}/pdf`} variant="ghost">
                        Download PDF
                      </ButtonLink>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
