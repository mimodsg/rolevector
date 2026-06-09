import { Panel } from "@/components/ui/panel";
import { HelperText, SectionTitle } from "@/components/ui/typography";
import type { MasterCv } from "@/lib/schemas/master-cv";

function ListSection({
  items,
  title
}: {
  items: string[];
  title: string;
}) {
  return (
    <Panel>
      <SectionTitle className="text-2xl">{title}</SectionTitle>
      {items.length === 0 ? (
        <HelperText className="mt-3">No entries saved.</HelperText>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              className="rounded-full border border-rv-border bg-rv-bg/50 px-3 py-1 text-sm text-rv-text"
              key={item}
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function MasterCvSnapshotView({ masterCv }: { masterCv: MasterCv }) {
  return (
    <div className="grid gap-6">
      <Panel>
        <SectionTitle>{masterCv.basics.full_name}</SectionTitle>
        <div className="mt-3 grid gap-2 text-sm text-rv-text-muted md:grid-cols-2">
          <p>Title: {masterCv.basics.title || "-"}</p>
          <p>Email: {masterCv.basics.email}</p>
          <p>Phone: {masterCv.basics.phone || "-"}</p>
          <p>Location: {masterCv.basics.location || "-"}</p>
          <p>LinkedIn: {masterCv.basics.linkedin || "-"}</p>
          <p>Website: {masterCv.basics.website || "-"}</p>
        </div>
      </Panel>

      <Panel>
        <SectionTitle className="text-2xl">Professional Summary</SectionTitle>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-rv-text-muted">
          {masterCv.summary || "No summary saved."}
        </p>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <ListSection items={masterCv.hard_skills} title="Hard Skills" />
        <ListSection items={masterCv.soft_skills} title="Soft Skills" />
        <ListSection items={masterCv.technical_skills.languages} title="Technical Languages" />
        <ListSection items={masterCv.technical_skills.frameworks} title="Frameworks" />
        <ListSection items={masterCv.technical_skills.cms} title="CMS" />
        <ListSection items={masterCv.technical_skills.tools} title="Tools" />
      </div>

      <Panel>
        <SectionTitle className="text-2xl">Work Experience</SectionTitle>
        <div className="mt-4 grid gap-4">
          {masterCv.work_experience.length === 0 ? (
            <HelperText>No work experience entries saved.</HelperText>
          ) : (
            masterCv.work_experience.map((item, index) => (
              <div
                className="rounded-rvmd border border-rv-border bg-rv-bg/40 p-4"
                key={`${item.company}-${item.title}-${index}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-rv-text">{item.title}</p>
                    <p className="text-sm text-rv-text-muted">{item.company}</p>
                  </div>
                  <div className="text-right text-sm text-rv-text-muted">
                    <p>{[item.start_date, item.end_date || (item.current ? "Present" : "")].filter(Boolean).join(" - ") || "-"}</p>
                    <p>{item.location || "-"}</p>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-rv-text-muted">
                  {item.description || "No description saved."}
                </p>
              </div>
            ))
          )}
        </div>
      </Panel>

      <Panel>
        <SectionTitle className="text-2xl">Projects</SectionTitle>
        <div className="mt-4 grid gap-4">
          {masterCv.projects.length === 0 ? (
            <HelperText>No project entries saved.</HelperText>
          ) : (
            masterCv.projects.map((item, index) => (
              <div
                className="rounded-rvmd border border-rv-border bg-rv-bg/40 p-4"
                key={`${item.title}-${index}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-bold text-rv-text">{item.title}</p>
                  <p className="text-sm text-rv-text-muted">{item.client || "-"}</p>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-rv-text-muted">
                  {item.description || "No description saved."}
                </p>
              </div>
            ))
          )}
        </div>
      </Panel>

      <Panel>
        <SectionTitle className="text-2xl">Education</SectionTitle>
        <div className="mt-4 grid gap-4">
          {masterCv.education.length === 0 ? (
            <HelperText>No education entries saved.</HelperText>
          ) : (
            masterCv.education.map((item, index) => (
              <div
                className="rounded-rvmd border border-rv-border bg-rv-bg/40 p-4"
                key={`${item.institution}-${index}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-rv-text">{item.institution}</p>
                    <p className="text-sm text-rv-text-muted">{item.degree || "-"}</p>
                  </div>
                  <div className="text-right text-sm text-rv-text-muted">
                    <p>{[item.start_date, item.end_date].filter(Boolean).join(" - ") || "-"}</p>
                    <p>{item.location || "-"}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
