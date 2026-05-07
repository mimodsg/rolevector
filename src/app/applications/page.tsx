import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";

export default function ApplicationsPage() {
  return (
    <AppShell title="Applications">
      <section className="overflow-hidden rounded-md border border-[#d9deea] bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#eef2f7] text-[#4d5b6f]">
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
              <td className="px-4 py-5 text-[#4d5b6f]" colSpan={5}>
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
      </section>
    </AppShell>
  );
}
