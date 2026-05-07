import Link from "next/link";
import { AppShell } from "@/components/app-shell";

const metrics = [
  { label: "Applications", value: "0" },
  { label: "Average ATS score", value: "-" },
  { label: "Interviews", value: "0" },
  { label: "Offers", value: "0" }
];

export default function DashboardPage() {
  return (
    <AppShell
      actions={
        <Link
          className="rounded-md bg-[#1f6f5b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#185847]"
          href="/optimize"
        >
          New optimization
        </Link>
      }
      title="Dashboard"
    >
      <div className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => (
          <section
            className="rounded-md border border-[#d9deea] bg-white p-5 shadow-sm"
            key={metric.label}
          >
            <p className="text-sm font-medium text-[#4d5b6f]">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
          </section>
        ))}
      </div>
      <section className="rounded-md border border-[#d9deea] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Recent applications</h2>
        <p className="mt-3 text-sm leading-6 text-[#4d5b6f]">
          Application history will appear here after the first optimization.
        </p>
      </section>
    </AppShell>
  );
}
