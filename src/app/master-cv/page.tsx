import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

const sections = [
  "Basics",
  "Professional Summary",
  "Core Skills",
  "Technical Skills",
  "Work Experience",
  "Projects",
  "Education",
  "Certifications",
  "Languages",
  "Hidden Context"
];

export default function MasterCvPage() {
  return (
    <AppShell title="Master CV">
      <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Panel as="aside" className="p-4">
          <nav className="flex flex-col gap-1">
            {sections.map((section) => (
              <a
                className="rounded-rvmd px-3 py-2 text-sm font-bold text-rv-text-muted hover:bg-rv-primary-soft hover:text-rv-text"
                href={`#${section.toLowerCase().replaceAll(" ", "-")}`}
                key={section}
              >
                {section}
              </a>
            ))}
          </nav>
        </Panel>
        <Panel as="form">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name">
              <TextInput />
            </Field>
            <Field label="Professional title">
              <TextInput />
            </Field>
            <Field label="Email">
              <TextInput type="email" />
            </Field>
            <Field label="Location">
              <TextInput />
            </Field>
          </div>
          <Field className="mt-4" label="Summary">
            <TextArea />
          </Field>
          <Button className="mt-5" type="button">
            Save master CV
          </Button>
        </Panel>
      </section>
    </AppShell>
  );
}
