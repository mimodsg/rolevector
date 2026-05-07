import { Alert, Tag } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { Metric } from "@/components/ui/metric";
import { Panel } from "@/components/ui/panel";
import { ScoreCard } from "@/components/ui/score-card";
import { Eyebrow, PageTitle, Subtitle } from "@/components/ui/typography";

const workflow = [
  "Build a truthful master CV",
  "Paste a job description",
  "Generate an ATS-safe application",
  "Track score and history"
];

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10 text-rv-text">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Panel elevated>
            <Eyebrow>ATS Optimization App</Eyebrow>
            <PageTitle className="mt-3 text-5xl md:text-7xl">RoleVector</PageTitle>
            <Subtitle className="mt-3">ATS CV optimizer</Subtitle>
            <p className="mt-4 max-w-3xl text-base leading-7 text-rv-text-soft">
                Local-first workspace for maintaining a master CV, generating
                tailored applications, and preserving each generated snapshot.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/dashboard">
              Open workspace
              </ButtonLink>
              <ButtonLink href="/optimize" variant="ghost">
                Optimize
              </ButtonLink>
            </div>
          </Panel>
          <ScoreCard
            score="8.4"
            summary="Frontend architecture, CMS platforms, and technical leadership are well represented."
          />
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          {workflow.map((item, index) => (
            <Metric
              key={item}
              label={item}
              value={String(index + 1).padStart(2, "0")}
            />
          ))}
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel as="form">
            <Field htmlFor="job-description-input" label="Job description">
              <TextArea
                className="min-h-80"
                id="job-description-input"
                placeholder="Paste the role description here..."
              />
            </Field>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button">
                Optimize CV for Position
              </Button>
              <Button type="button" variant="ghost">
                Save draft
              </Button>
            </div>
          </Panel>

          <Panel as="aside">
            <h2 className="font-title text-xl uppercase text-rv-text">MVP modules</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Tag>ATS Ready</Tag>
              <Tag>JSON Source</Tag>
              <Tag>PDF Output</Tag>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-rv-text-muted">
              <li>Authentication and session management</li>
              <li>Master CV CRUD with structured JSON</li>
              <li>OpenAI parsing and optimization services</li>
              <li>Application history with ATS score tracking</li>
              <li>Puppeteer PDF export from ATS-safe templates</li>
            </ul>
            <Alert className="mt-4" tone="warning">
              The optimizer is scaffolded with deterministic mock output until OpenAI wiring is finalized.
            </Alert>
          </Panel>
        </section>
      </section>
    </main>
  );
}
