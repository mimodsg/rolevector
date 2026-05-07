import { AppShell } from "@/components/app-shell";
import { Alert, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { ScoreCard } from "@/components/ui/score-card";
import { HelperText } from "@/components/ui/typography";

export default function OptimizePage() {
  return (
    <AppShell title="Optimize CV">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel as="form" className="block">
          <Field
            helper="The original pasted text is stored with the generated application snapshot."
            htmlFor="job-description-input"
            label="Job description"
          >
            <TextArea
              className="min-h-96"
              id="job-description-input"
              placeholder="Paste the role description here..."
            />
          </Field>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button">
              Optimize CV for Position
            </Button>
            <Button type="button" variant="ghost">
              Save Draft
            </Button>
          </div>
        </Panel>
        <aside className="grid gap-6">
          <ScoreCard
            score="8.4"
            summary="Frontend architecture, API development, and database skills are well represented."
          />
          <Panel>
            <h2 className="font-title text-xl uppercase text-rv-text">
              Generation output
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Tag>ATS Ready</Tag>
              <Tag>Balanced CV</Tag>
            </div>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-bold text-rv-text-soft">Parsed metadata</dt>
                <dd className="mt-1 text-rv-text-muted">
                  Waiting for job description.
                </dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">ATS score</dt>
                <dd className="mt-1 text-rv-text-muted">-</dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">Cover letter</dt>
                <dd className="mt-1 text-rv-text-muted">
                  Generated after optimization.
                </dd>
              </div>
            </dl>
            <Alert className="mt-4">
              Strong keyword coverage will appear here after analysis.
            </Alert>
            <HelperText className="mt-4">
              Every generated result remains immutable in application history.
            </HelperText>
          </Panel>
        </aside>
      </section>
    </AppShell>
  );
}
