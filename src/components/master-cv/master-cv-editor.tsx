"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Alert, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FileInput, Select, TextArea, TextInput } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { HelperText, SectionTitle } from "@/components/ui/typography";
import type { MasterCv } from "@/lib/schemas/master-cv";

type WorkExperienceItem = MasterCv["work_experience"][number];
type ProjectItem = MasterCv["projects"][number];
type EducationItem = MasterCv["education"][number];
type SkillOptions = {
  cms: string[];
  frameworks: string[];
  hardSkills: string[];
  programmingLanguages: string[];
  softSkills: string[];
  tools: string[];
};

function emptyMasterCv(userName: string, userEmail: string): MasterCv {
  return {
    basics: {
      full_name: userName,
      title: "",
      email: userEmail,
      phone: "",
      location: "",
      linkedin: "",
      website: ""
    },
    summary: "",
    hard_skills: [],
    soft_skills: [],
    technical_skills: {
      languages: [],
      frameworks: [],
      cms: [],
      tools: []
    },
    work_experience: [],
    projects: [],
    education: [],
    certifications: [],
    languages: [],
    hidden_context: {
      additional_experience: [],
      keywords: []
    }
  };
}

function linesToList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToLines(items: string[]) {
  return items.join("\n");
}

function listsEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function toggleListValue(items: string[], value: string) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

function workExperienceSortValue(item: WorkExperienceItem) {
  const value = item.end_date || item.start_date;
  const parsed = Date.parse(`${value || "0000-01"}-01`);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareWorkExperienceByDate(a: WorkExperienceItem, b: WorkExperienceItem) {
  if (a.current !== b.current) {
    return a.current ? -1 : 1;
  }

  return workExperienceSortValue(b) - workExperienceSortValue(a);
}

function workExperienceDateRange(item: WorkExperienceItem) {
  if (!item.start_date && !item.end_date && !item.current) {
    return "";
  }

  const endDate = item.current ? "Present" : item.end_date;

  return [item.start_date, endDate].filter(Boolean).join(" - ");
}

function prepareForSave(masterCv: MasterCv): MasterCv {
  return {
    ...masterCv,
    work_experience: masterCv.work_experience.filter(
      (item) => item.company.trim() && item.title.trim()
    ),
    projects: masterCv.projects.filter((item) => item.title.trim()),
    education: masterCv.education.filter((item) => item.institution.trim())
  };
}

async function parseResponse<TPayload extends object>(response: Response) {
  const text = await response.text();
  let payload: { error?: string } = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = (payload.error ?? text) || `The master CV request failed (${response.status}).`;
    throw new Error(message);
  }

  return payload as TPayload;
}

export function MasterCvEditor({
  initialMasterCv,
  userEmail,
  userName
}: {
  initialMasterCv: MasterCv | null;
  userEmail: string;
  userName: string;
}) {
  const [masterCv, setMasterCv] = useState<MasterCv>(
    initialMasterCv ?? emptyMasterCv(userName, userEmail)
  );
  const [status, setStatus] = useState<{
    message: string;
    tone: "success" | "warning" | "error";
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedExperienceIndexes, setExpandedExperienceIndexes] = useState<Set<number>>(
    () => new Set()
  );

  function updateMasterCv(next: Partial<MasterCv>) {
    setMasterCv((current) => ({ ...current, ...next }));
  }

  function updateBasics(next: Partial<MasterCv["basics"]>) {
    setMasterCv((current) => ({
      ...current,
      basics: { ...current.basics, ...next }
    }));
  }

  function updateTechnicalSkills(next: Partial<MasterCv["technical_skills"]>) {
    setMasterCv((current) => ({
      ...current,
      technical_skills: { ...current.technical_skills, ...next }
    }));
  }

  function updateHiddenContext(next: Partial<MasterCv["hidden_context"]>) {
    setMasterCv((current) => ({
      ...current,
      hidden_context: { ...current.hidden_context, ...next }
    }));
  }

  function updateListItem<TItem>(
    field: "work_experience" | "projects" | "education",
    index: number,
    next: Partial<TItem>
  ) {
    setMasterCv((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...next } : item
      )
    }));
  }

  function removeListItem(field: "work_experience" | "projects" | "education", index: number) {
    setMasterCv((current) => ({
      ...current,
      [field]: current[field].filter((_, itemIndex) => itemIndex !== index)
    }));

    if (field === "work_experience") {
      setExpandedExperienceIndexes((current) => {
        const next = new Set<number>();
        current.forEach((itemIndex) => {
          if (itemIndex < index) {
            next.add(itemIndex);
          } else if (itemIndex > index) {
            next.add(itemIndex - 1);
          }
        });
        return next;
      });
    }
  }

  function addWorkExperience() {
    const nextIndex = masterCv.work_experience.length;

    updateMasterCv({
      work_experience: [
        ...masterCv.work_experience,
        {
          company: "",
          title: "",
          location: "",
          engagement_type: "",
          start_date: "",
          end_date: "",
          current: false,
          description: "",
          hard_skills: [],
          soft_skills: [],
          programming_languages: [],
          frameworks: [],
          cms: [],
          tools: []
        }
      ]
    });
    setExpandedExperienceIndexes((current) => new Set([...current, nextIndex]));
  }

  function sortWorkExperienceByDate() {
    updateMasterCv({
      work_experience: [...masterCv.work_experience].sort(compareWorkExperienceByDate)
    });
    setExpandedExperienceIndexes(new Set());
  }

  function toggleExperience(index: number) {
    setExpandedExperienceIndexes((current) => {
      const next = new Set(current);

      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      return next;
    });
  }

  async function saveMasterCv(event: FormEvent<HTMLElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSaving(true);

    try {
      const payload = await parseResponse<{ masterCv: MasterCv }>(
        await fetch("/api/master-cv", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(prepareForSave(masterCv))
        })
      );

      setMasterCv(payload.masterCv);
      setStatus({ message: "Master CV saved.", tone: "success" });
    } catch (error) {
      setStatus({
        message: error instanceof Error ? error.message : "Unable to save master CV.",
        tone: "error"
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMasterCv() {
    setStatus(null);
    setIsDeleting(true);

    try {
      await parseResponse<{ ok: boolean }>(
        await fetch("/api/master-cv", {
          method: "DELETE"
        })
      );
      setMasterCv(emptyMasterCv(userName, userEmail));
      setExpandedExperienceIndexes(new Set());
      setStatus({ message: "Master CV deleted.", tone: "warning" });
    } catch (error) {
      setStatus({
        message: error instanceof Error ? error.message : "Unable to delete master CV.",
        tone: "error"
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function importMasterCv(file: File | null) {
    if (!file) {
      return;
    }

    setStatus(null);
    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const payload = await parseResponse<{
        masterCv: MasterCv;
        metadata: { characters: number; fileName: string };
      }>(
        await fetch("/api/master-cv/import", {
          method: "POST",
          body: formData
        })
      );

      setMasterCv(payload.masterCv);
      setExpandedExperienceIndexes(new Set());
      setStatus({
        message: `Imported ${payload.metadata.fileName}. Review the parsed fields, then save.`,
        tone: "success"
      });
    } catch (error) {
      setStatus({
        message: error instanceof Error ? error.message : "Unable to import this file.",
        tone: "error"
      });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Panel as="form" onSubmit={saveMasterCv}>
      <div className="sticky top-0 z-20 -mx-5 -mt-5 border-b border-rv-border bg-rv-surface/95 px-5 pb-4 pt-5 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionTitle className="text-2xl md:text-3xl">Profile source</SectionTitle>
            <HelperText className="mt-2">
              Keep this factual. Generated applications use this as their source of truth.
            </HelperText>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save master CV"}
            </Button>
            <Button
              disabled={isDeleting}
              onClick={deleteMasterCv}
              type="button"
              variant="ghost"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>

        {status ? (
          <Alert className="mt-5" tone={status.tone}>
            {status.message}
          </Alert>
        ) : null}
      </div>

      <section className="mt-6 rounded-rvmd border border-rv-border bg-rv-bg/40 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="font-title text-lg uppercase text-rv-highlight">Import CV</h3>
            <HelperText className="mt-1">
              Upload a text or PDF resume to prefill the form. Nothing is saved until you review and save.
            </HelperText>
          </div>
          <Field className="w-full md:max-w-sm" label="TXT or PDF file">
            <FileInput
              accept=".txt,.pdf,text/plain,application/pdf"
              disabled={isImporting}
              onChange={(event) => {
                void importMasterCv(event.currentTarget.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
          </Field>
        </div>
      </section>

      <section className="mt-6 grid items-start gap-4 md:grid-cols-2" id="basics">
        <Field label="Full name">
          <TextInput
            onChange={(event) => updateBasics({ full_name: event.currentTarget.value })}
            required
            value={masterCv.basics.full_name}
          />
        </Field>
        <Field label="Professional title">
          <TextInput
            onChange={(event) => updateBasics({ title: event.currentTarget.value })}
            value={masterCv.basics.title}
          />
        </Field>
        <Field label="Email">
          <TextInput
            onChange={(event) => updateBasics({ email: event.currentTarget.value })}
            required
            type="email"
            value={masterCv.basics.email}
          />
        </Field>
        <Field label="Phone">
          <TextInput
            onChange={(event) => updateBasics({ phone: event.currentTarget.value })}
            value={masterCv.basics.phone}
          />
        </Field>
        <Field label="Location">
          <TextInput
            onChange={(event) => updateBasics({ location: event.currentTarget.value })}
            value={masterCv.basics.location}
          />
        </Field>
        <Field label="LinkedIn">
          <TextInput
            onChange={(event) => updateBasics({ linkedin: event.currentTarget.value })}
            value={masterCv.basics.linkedin}
          />
        </Field>
        <Field label="Website">
          <TextInput
            onChange={(event) => updateBasics({ website: event.currentTarget.value })}
            value={masterCv.basics.website}
          />
        </Field>
      </section>

      <section className="mt-6" id="professional-summary">
        <Field label="Professional summary">
          <TextArea
            onChange={(event) => updateMasterCv({ summary: event.currentTarget.value })}
            value={masterCv.summary}
          />
        </Field>
      </section>

      <section className="mt-6 grid items-start gap-4 md:grid-cols-2" id="skills">
        <ListField
          label="Hard skills"
          onChange={(items) => updateMasterCv({ hard_skills: items })}
          value={masterCv.hard_skills}
        />
        <ListField
          label="Soft skills"
          onChange={(items) => updateMasterCv({ soft_skills: items })}
          value={masterCv.soft_skills}
        />
        <ListField
          label="Certifications"
          onChange={(items) => updateMasterCv({ certifications: items })}
          value={masterCv.certifications}
        />
        <ListField
          label="Languages"
          onChange={(items) => updateMasterCv({ languages: items })}
          value={masterCv.languages}
        />
      </section>

      <section className="mt-6 grid items-start gap-4 md:grid-cols-2" id="technical-skills">
        <ListField
          label="Programming languages"
          onChange={(items) => updateTechnicalSkills({ languages: items })}
          value={masterCv.technical_skills.languages}
        />
        <ListField
          label="Frameworks"
          onChange={(items) => updateTechnicalSkills({ frameworks: items })}
          value={masterCv.technical_skills.frameworks}
        />
        <ListField
          label="CMS"
          onChange={(items) => updateTechnicalSkills({ cms: items })}
          value={masterCv.technical_skills.cms}
        />
        <ListField
          label="Tools"
          onChange={(items) => updateTechnicalSkills({ tools: items })}
          value={masterCv.technical_skills.tools}
        />
      </section>

      <section className="mt-8" id="work-experience">
        <RepeaterHeader title="Work experience" />
        <div className="mt-4 grid gap-4">
          {masterCv.work_experience.map((item, index) => (
            <WorkExperienceCard
              index={index}
              isExpanded={expandedExperienceIndexes.has(index)}
              item={item}
              key={index}
              onChange={(next) =>
                updateListItem<WorkExperienceItem>("work_experience", index, next)
              }
              onRemove={() => removeListItem("work_experience", index)}
              onToggle={() => toggleExperience(index)}
              skillOptions={{
                cms: masterCv.technical_skills.cms,
                frameworks: masterCv.technical_skills.frameworks,
                hardSkills: masterCv.hard_skills,
                programmingLanguages: masterCv.technical_skills.languages,
                softSkills: masterCv.soft_skills,
                tools: masterCv.technical_skills.tools
              }}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <Button onClick={sortWorkExperienceByDate} type="button" variant="ghost">
            Sort by date
          </Button>
          <Button onClick={addWorkExperience} type="button" variant="ghost">
            Add experience
          </Button>
        </div>
      </section>

      <section className="mt-8" id="projects">
        <RepeaterHeader
          actionLabel="Add project"
          onAdd={() =>
            updateMasterCv({
              projects: [
                ...masterCv.projects,
                { title: "", description: "", technologies: [] }
              ]
            })
          }
          title="Projects"
        />
        <div className="mt-4 grid gap-4">
          {masterCv.projects.map((item, index) => (
            <ProjectCard
              index={index}
              item={item}
              key={index}
              onChange={(next) => updateListItem<ProjectItem>("projects", index, next)}
              onRemove={() => removeListItem("projects", index)}
            />
          ))}
        </div>
      </section>

      <section className="mt-8" id="education">
        <RepeaterHeader
          actionLabel="Add education"
          onAdd={() =>
            updateMasterCv({
              education: [
                ...masterCv.education,
                { institution: "", degree: "", location: "", start_date: "", end_date: "" }
              ]
            })
          }
          title="Education"
        />
        <div className="mt-4 grid gap-4">
          {masterCv.education.map((item, index) => (
            <EducationCard
              index={index}
              item={item}
              key={index}
              onChange={(next) => updateListItem<EducationItem>("education", index, next)}
              onRemove={() => removeListItem("education", index)}
            />
          ))}
        </div>
      </section>

      <section className="mt-6 grid items-start gap-4 md:grid-cols-2" id="hidden-context">
        <ListField
          label="Additional hidden experience"
          onChange={(items) => updateHiddenContext({ additional_experience: items })}
          value={masterCv.hidden_context.additional_experience}
        />
        <ListField
          label="Hidden keywords"
          onChange={(items) => updateHiddenContext({ keywords: items })}
          value={masterCv.hidden_context.keywords}
        />
      </section>
    </Panel>
  );
}

function ListField({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (items: string[]) => void;
  value: string[];
}) {
  const [draft, setDraft] = useState(() => listToLines(value));

  useEffect(() => {
    if (!listsEqual(linesToList(draft), value)) {
      setDraft(listToLines(value));
    }
  }, [draft, value]);

  return (
    <Field helper="One item per line, or comma-separated." label={label}>
      <TextArea
        className="min-h-28"
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          setDraft(nextValue);
          onChange(linesToList(nextValue));
        }}
        value={draft}
      />
    </Field>
  );
}

function RepeaterHeader({
  actionLabel,
  onAdd,
  title
}: {
  actionLabel?: string;
  onAdd?: () => void;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <SectionTitle className="text-xl md:text-2xl">{title}</SectionTitle>
        <Tag>Repeatable</Tag>
      </div>
      {actionLabel && onAdd ? (
        <Button onClick={onAdd} type="button" variant="ghost">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function WorkExperienceCard({
  index,
  isExpanded,
  item,
  onChange,
  onRemove,
  onToggle,
  skillOptions
}: {
  index: number;
  isExpanded: boolean;
  item: WorkExperienceItem;
  onChange: (next: Partial<WorkExperienceItem>) => void;
  onRemove: () => void;
  onToggle: () => void;
  skillOptions: SkillOptions;
}) {
  return (
    <Panel className="bg-rv-bg/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          className="text-left"
          onClick={onToggle}
          type="button"
        >
          <h3 className="font-title text-lg uppercase text-rv-highlight">
            Experience {index + 1}
          </h3>
          <p className="mt-1 text-sm font-normal text-rv-text-muted">
            {[item.title, item.company, workExperienceDateRange(item)].filter(Boolean).join(" · ") ||
              "Collapsed entry"}
          </p>
        </button>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onToggle} type="button" variant="ghost">
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
          <Button onClick={onRemove} type="button" variant="ghost">
            Remove
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <>
      <div className="mt-4 grid items-start gap-4 md:grid-cols-2">
        <Field label="Company">
          <TextInput
            onChange={(event) => onChange({ company: event.currentTarget.value })}
            required
            value={item.company}
          />
        </Field>
        <Field label="Title">
          <TextInput
            onChange={(event) => onChange({ title: event.currentTarget.value })}
            required
            value={item.title}
          />
        </Field>
        <Field label="Location">
          <TextInput
            onChange={(event) => onChange({ location: event.currentTarget.value })}
            value={item.location}
          />
        </Field>
        <Field label="Engagement type">
          <Select
            onChange={(event) => onChange({ engagement_type: event.currentTarget.value as WorkExperienceItem["engagement_type"] })}
            value={item.engagement_type}
          >
            <option value="">Select engagement type</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="project-based contract">Project-based contract</option>
          </Select>
        </Field>
        <Field label="Start date">
          <TextInput
            onChange={(event) => onChange({ start_date: event.currentTarget.value })}
            placeholder="2024-01"
            value={item.start_date}
          />
        </Field>
        <Field label="End date">
          <TextInput
            disabled={item.current}
            onChange={(event) => onChange({ end_date: event.currentTarget.value })}
            placeholder="2026-05"
            value={item.end_date}
          />
        </Field>
        <label className="flex items-center gap-3 pt-8 text-sm font-bold text-rv-text-soft">
          <input
            checked={item.current}
            className="h-4 w-4 accent-rv-highlight"
            onChange={(event) =>
              onChange({
                current: event.currentTarget.checked,
                end_date: event.currentTarget.checked ? "" : item.end_date
              })
            }
            type="checkbox"
          />
          Current role
        </label>
      </div>
      <Field className="mt-4" label="Description">
        <TextArea
          onChange={(event) => onChange({ description: event.currentTarget.value })}
          value={item.description}
        />
      </Field>
      <div className="mt-4 grid items-start gap-4 md:grid-cols-2">
        <MultiSelectField
          label="Hard skills"
          onChange={(items) => onChange({ hard_skills: items })}
          options={skillOptions.hardSkills}
          value={item.hard_skills}
        />
        <MultiSelectField
          label="Soft skills"
          onChange={(items) => onChange({ soft_skills: items })}
          options={skillOptions.softSkills}
          value={item.soft_skills}
        />
        <MultiSelectField
          label="Programming languages"
          onChange={(items) => onChange({ programming_languages: items })}
          options={skillOptions.programmingLanguages}
          value={item.programming_languages}
        />
        <MultiSelectField
          label="Frameworks"
          onChange={(items) => onChange({ frameworks: items })}
          options={skillOptions.frameworks}
          value={item.frameworks}
        />
        <MultiSelectField
          label="CMS"
          onChange={(items) => onChange({ cms: items })}
          options={skillOptions.cms}
          value={item.cms}
        />
        <MultiSelectField
          label="Tools"
          onChange={(items) => onChange({ tools: items })}
          options={skillOptions.tools}
          value={item.tools}
        />
      </div>
        </>
      ) : null}
    </Panel>
  );
}

function MultiSelectField({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (items: string[]) => void;
  options: string[];
  value: string[];
}) {
  const uniqueOptions = [...new Set([...options, ...value].filter(Boolean))];

  return (
    <Field label={label}>
      <div className="grid min-h-11 gap-2 rounded-rvmd border border-rv-border bg-rv-bg px-3.5 py-3">
        {uniqueOptions.length > 0 ? (
          uniqueOptions.map((option) => (
            <span
              className="flex items-center gap-2 text-sm font-normal text-rv-text"
              key={option}
            >
              <input
                checked={value.includes(option)}
                className="h-4 w-4 accent-rv-highlight"
                onChange={() => onChange(toggleListValue(value, option))}
                type="checkbox"
              />
              {option}
            </span>
          ))
        ) : (
          <span className="text-sm font-normal text-rv-text-muted">
            Add options in the skills sections above.
          </span>
        )}
      </div>
    </Field>
  );
}

function ProjectCard({
  index,
  item,
  onChange,
  onRemove
}: {
  index: number;
  item: ProjectItem;
  onChange: (next: Partial<ProjectItem>) => void;
  onRemove: () => void;
}) {
  return (
    <Panel className="bg-rv-bg/40">
      <CardHeader index={index} onRemove={onRemove} title="Project" />
      <Field className="mt-4" label="Title">
        <TextInput
          onChange={(event) => onChange({ title: event.currentTarget.value })}
          required
          value={item.title}
        />
      </Field>
      <Field className="mt-4" label="Description">
        <TextArea
          onChange={(event) => onChange({ description: event.currentTarget.value })}
          value={item.description}
        />
      </Field>
      <ListField
        label="Technologies"
        onChange={(items) => onChange({ technologies: items })}
        value={item.technologies}
      />
    </Panel>
  );
}

function EducationCard({
  index,
  item,
  onChange,
  onRemove
}: {
  index: number;
  item: EducationItem;
  onChange: (next: Partial<EducationItem>) => void;
  onRemove: () => void;
}) {
  return (
    <Panel className="bg-rv-bg/40">
      <CardHeader index={index} onRemove={onRemove} title="Education" />
      <div className="mt-4 grid items-start gap-4 md:grid-cols-2">
        <Field label="Institution">
          <TextInput
            onChange={(event) => onChange({ institution: event.currentTarget.value })}
            required
            value={item.institution}
          />
        </Field>
        <Field label="Degree">
          <TextInput
            onChange={(event) => onChange({ degree: event.currentTarget.value })}
            value={item.degree}
          />
        </Field>
        <Field label="Location">
          <TextInput
            onChange={(event) => onChange({ location: event.currentTarget.value })}
            value={item.location}
          />
        </Field>
        <Field label="Start date">
          <TextInput
            onChange={(event) => onChange({ start_date: event.currentTarget.value })}
            value={item.start_date}
          />
        </Field>
        <Field label="End date">
          <TextInput
            onChange={(event) => onChange({ end_date: event.currentTarget.value })}
            value={item.end_date}
          />
        </Field>
      </div>
    </Panel>
  );
}

function CardHeader({
  index,
  onRemove,
  title
}: {
  index: number;
  onRemove: () => void;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-title text-lg uppercase text-rv-highlight">
        {title} {index + 1}
      </h3>
      <Button onClick={onRemove} type="button" variant="ghost">
        Remove
      </Button>
    </div>
  );
}
