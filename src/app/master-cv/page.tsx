import { AppShell } from "@/components/app-shell";

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
        <aside className="rounded-md border border-[#d9deea] bg-white p-4 shadow-sm">
          <nav className="flex flex-col gap-1">
            {sections.map((section) => (
              <a
                className="rounded-md px-3 py-2 text-sm font-medium text-[#4d5b6f] hover:bg-[#eef2f7] hover:text-[#172033]"
                href={`#${section.toLowerCase().replaceAll(" ", "-")}`}
                key={section}
              >
                {section}
              </a>
            ))}
          </nav>
        </aside>
        <form className="rounded-md border border-[#d9deea] bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Full name
              <input className="rounded-md border border-[#c7cfdd] px-3 py-2 font-normal outline-none focus:border-[#1f6f5b]" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Professional title
              <input className="rounded-md border border-[#c7cfdd] px-3 py-2 font-normal outline-none focus:border-[#1f6f5b]" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Email
              <input className="rounded-md border border-[#c7cfdd] px-3 py-2 font-normal outline-none focus:border-[#1f6f5b]" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Location
              <input className="rounded-md border border-[#c7cfdd] px-3 py-2 font-normal outline-none focus:border-[#1f6f5b]" />
            </label>
          </div>
          <label className="mt-4 flex flex-col gap-2 text-sm font-semibold">
            Summary
            <textarea className="min-h-32 rounded-md border border-[#c7cfdd] px-3 py-2 font-normal outline-none focus:border-[#1f6f5b]" />
          </label>
          <button
            className="mt-5 rounded-md bg-[#1f6f5b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#185847]"
            type="button"
          >
            Save master CV
          </button>
        </form>
      </section>
    </AppShell>
  );
}
