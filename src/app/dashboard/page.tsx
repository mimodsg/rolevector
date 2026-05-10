import { AppShell } from "@/components/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Metric } from "@/components/ui/metric";
import { Panel } from "@/components/ui/panel";
import { Alert, Tag } from "@/components/ui/badge";

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
          <Tag>JSON Source</Tag>
          <Tag>PDF Output</Tag>
        </div>
        <p className="mt-3 text-sm leading-6 text-rv-text-muted">
          Application history will appear here after the first optimization.
        </p>
        <Alert className="mt-4" tone="warning">
          Seed data is available in the database; list rendering comes in the next feature slice.
        </Alert>
      </Panel>
    </AppShell>
  );
}
