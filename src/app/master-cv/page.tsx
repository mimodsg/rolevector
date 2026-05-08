import { AppShell } from "@/components/app-shell";
import { MasterCvEditor } from "@/components/master-cv/master-cv-editor";
import { Panel } from "@/components/ui/panel";
import { prisma } from "@/lib/prisma";
import { masterCvRecordToMasterCv } from "@/lib/master-cv";
import { requireCurrentUser } from "@/lib/server/session";

const sections = [
  "Basics",
  "Professional Summary",
  "Skills",
  "Technical Skills",
  "Work Experience",
  "Projects",
  "Education",
  "Certifications",
  "Languages",
  "Hidden Context"
];

export default async function MasterCvPage() {
  const user = await requireCurrentUser();
  const masterCv = await prisma.masterCV.findUnique({
    where: { userId: user.id },
    include: {
      workExperiences: {
        orderBy: { sortOrder: "asc" }
      },
      projects: {
        orderBy: { sortOrder: "asc" }
      },
      educationEntries: {
        orderBy: { sortOrder: "asc" }
      }
    }
  });

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
        <MasterCvEditor
          initialMasterCv={masterCv ? masterCvRecordToMasterCv(masterCv) : null}
          userEmail={user.email}
          userName={user.name}
        />
      </section>
    </AppShell>
  );
}
