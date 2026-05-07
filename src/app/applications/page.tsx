import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Panel } from "@/components/ui/panel";

export default function ApplicationsPage() {
  return (
    <AppShell title="Applications">
      <Panel className="overflow-hidden p-0">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-rv-bg text-rv-text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Position</th>
              <th className="px-4 py-3 font-semibold">ATS score</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-5 text-rv-text-muted" colSpan={5}>
                No generated applications yet.
              </td>
            </tr>
            <tr className="hidden">
              <td className="px-4 py-3">Acme Talent</td>
              <td className="px-4 py-3">Full Stack Developer</td>
              <td className="px-4 py-3">8.4</td>
              <td className="px-4 py-3">
                <StatusPill status="Draft" />
              </td>
              <td className="px-4 py-3">Today</td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
