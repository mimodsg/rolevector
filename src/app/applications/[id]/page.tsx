import { notFound } from "next/navigation";
import { Fragment } from "react";
import { AppShell } from "@/components/app-shell";
import { ApplicationStatusSelect } from "@/components/applications/application-status-select";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ScoreCard } from "@/components/ui/score-card";
import { masterCvSchema } from "@/lib/schemas/master-cv";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/server/session";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function list(items: string[]) {
  return items.filter(Boolean).join(", ") || "-";
}

function dateRange({
  current,
  endDate,
  startDate
}: {
  current?: boolean;
  endDate: string;
  startDate: string;
}) {
  return [startDate, current ? "Present" : endDate].filter(Boolean).join(" - ") || "-";
}

export default async function ApplicationPreviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireCurrentUserId();
  const { id } = await params;
  const application = await prisma.application.findFirst({
    where: { id, userId }
  });

  if (!application) {
    notFound();
  }

  const cv = masterCvSchema.parse(application.optimizedCvJson);

  return (
    <AppShell
      actions={
        <ButtonLink href={`/api/applications/${application.id}/pdf`} variant="highlight">
          Download PDF
        </ButtonLink>
      }
      title="Application Preview"
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-title text-2xl uppercase text-rv-highlight">
                  {application.positionTitle ?? "Untitled position"}
                </h2>
                <p className="mt-2 text-rv-text-muted">
                  {application.companyName ?? "Unknown company"}
                </p>
              </div>
              <div className="min-w-48">
                <ApplicationStatusSelect
                  applicationId={application.id}
                  initialStatus={application.status}
                />
              </div>
            </div>
            <dl className="mt-6 grid gap-4 text-sm md:grid-cols-3">
              <div>
                <dt className="font-bold text-rv-text-soft">Application date</dt>
                <dd className="mt-1 text-rv-text-muted">{formatDate(application.createdAt)}</dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">Salary</dt>
                <dd className="mt-1 text-rv-text-muted">{application.salary || "-"}</dd>
              </div>
              <div>
                <dt className="font-bold text-rv-text-soft">ATS score</dt>
                <dd className="mt-1 text-rv-text-muted">{application.atsScore.toFixed(1)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel>
            <h2 className="font-title text-xl uppercase text-rv-text">Optimized CV</h2>
            <h3 className="mt-5 font-bold text-rv-text-soft">Contact</h3>
            <p className="mt-1 text-sm text-rv-text-muted">{cv.basics.full_name}</p>
            <p className="text-sm text-rv-text-muted">{cv.basics.title || "-"}</p>
            <p className="text-sm text-rv-text-muted">Email: {cv.basics.email}</p>
            <p className="text-sm text-rv-text-muted">Phone: {cv.basics.phone || "-"}</p>
            <p className="text-sm text-rv-text-muted">Location: {cv.basics.location || "-"}</p>
            <p className="text-sm text-rv-text-muted">LinkedIn: {cv.basics.linkedin || "-"}</p>
            <p className="text-sm text-rv-text-muted">Website: {cv.basics.website || "-"}</p>

            <h3 className="mt-5 font-bold text-rv-text-soft">Professional Summary</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-rv-text-muted">
              {cv.summary || "-"}
            </p>

            <h3 className="mt-5 font-bold text-rv-text-soft">Skills</h3>
            <p className="mt-1 text-sm text-rv-text-muted">Hard skills: {list(cv.hard_skills)}</p>
            <p className="text-sm text-rv-text-muted">Soft skills: {list(cv.soft_skills)}</p>

            <h3 className="mt-5 font-bold text-rv-text-soft">Technical Skills</h3>
            <p className="mt-1 text-sm text-rv-text-muted">
              Programming languages: {list(cv.technical_skills.languages)}
            </p>
            <p className="text-sm text-rv-text-muted">
              Frameworks: {list(cv.technical_skills.frameworks)}
            </p>
            <p className="text-sm text-rv-text-muted">CMS: {list(cv.technical_skills.cms)}</p>
            <p className="text-sm text-rv-text-muted">Tools: {list(cv.technical_skills.tools)}</p>

            <h3 className="mt-5 font-bold text-rv-text-soft">Work Experience</h3>
            {cv.work_experience.length > 0 ? (
              cv.work_experience.map((item, index) => (
                <Fragment key={index}>
                  <h4 className="mt-4 text-sm font-bold text-rv-text">
                    {item.title} · {item.company}
                  </h4>
                  <p className="mt-1 text-sm text-rv-text-muted">
                    Dates:{" "}
                    {dateRange({
                      current: item.current,
                      endDate: item.end_date,
                      startDate: item.start_date
                    })}
                  </p>
                  <p className="text-sm text-rv-text-muted">Location: {item.location || "-"}</p>
                  <p className="text-sm text-rv-text-muted">
                    Engagement type: {item.engagement_type || "-"}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-rv-text-muted">
                    Description: {item.description || "-"}
                  </p>
                  <p className="text-sm text-rv-text-muted">
                    Hard skills: {list(item.hard_skills)}
                  </p>
                  <p className="text-sm text-rv-text-muted">
                    Soft skills: {list(item.soft_skills)}
                  </p>
                  <p className="text-sm text-rv-text-muted">
                    Programming languages: {list(item.programming_languages)}
                  </p>
                  <p className="text-sm text-rv-text-muted">Frameworks: {list(item.frameworks)}</p>
                  <p className="text-sm text-rv-text-muted">CMS: {list(item.cms)}</p>
                  <p className="text-sm text-rv-text-muted">Tools: {list(item.tools)}</p>
                </Fragment>
              ))
            ) : (
              <p className="mt-1 text-sm text-rv-text-muted">-</p>
            )}

            <h3 className="mt-5 font-bold text-rv-text-soft">Projects</h3>
            {cv.projects.length > 0 ? (
              cv.projects.map((project, index) => (
                <Fragment key={index}>
                  <h4 className="mt-4 text-sm font-bold text-rv-text">{project.title}</h4>
                  <p className="mt-1 text-sm text-rv-text-muted">
                    Client: {project.client || "-"}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-rv-text-muted">
                    Description: {project.description || "-"}
                  </p>
                </Fragment>
              ))
            ) : (
              <p className="mt-1 text-sm text-rv-text-muted">-</p>
            )}

            <h3 className="mt-5 font-bold text-rv-text-soft">Education</h3>
            {cv.education.length > 0 ? (
              cv.education.map((item, index) => (
                <Fragment key={index}>
                  <h4 className="mt-4 text-sm font-bold text-rv-text">{item.institution}</h4>
                  <p className="mt-1 text-sm text-rv-text-muted">Degree: {item.degree || "-"}</p>
                  <p className="text-sm text-rv-text-muted">Location: {item.location || "-"}</p>
                  <p className="text-sm text-rv-text-muted">
                    Dates: {dateRange({ endDate: item.end_date, startDate: item.start_date })}
                  </p>
                </Fragment>
              ))
            ) : (
              <p className="mt-1 text-sm text-rv-text-muted">-</p>
            )}

            <h3 className="mt-5 font-bold text-rv-text-soft">Certifications</h3>
            <p className="mt-1 text-sm text-rv-text-muted">{list(cv.certifications)}</p>

            <h3 className="mt-5 font-bold text-rv-text-soft">Languages</h3>
            <p className="mt-1 text-sm text-rv-text-muted">{list(cv.languages)}</p>

            <h3 className="mt-5 font-bold text-rv-text-soft">Optimization Context</h3>
            <p className="mt-1 text-sm text-rv-text-muted">
              Additional experience: {list(cv.hidden_context.additional_experience)}
            </p>
            <p className="text-sm text-rv-text-muted">
              Keywords: {list(cv.hidden_context.keywords)}
            </p>
          </Panel>

          <Panel>
            <h2 className="font-title text-xl uppercase text-rv-text">Cover Letter</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-rv-text-muted">
              {application.coverLetterText}
            </p>
          </Panel>
        </div>

        <aside className="grid content-start gap-6">
          <ScoreCard
            score={application.atsScore.toFixed(1)}
            summary="Snapshot generated from your Master CV and the pasted job opening."
          />
          <Panel>
            <h2 className="font-title text-xl uppercase text-rv-text">Job Details</h2>
            <p className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap text-sm leading-6 text-rv-text-muted">
              {application.jobDetails}
            </p>
          </Panel>
        </aside>
      </section>
    </AppShell>
  );
}
