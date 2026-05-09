"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { ScoreCard } from "@/components/ui/score-card";
import { HelperText } from "@/components/ui/typography";

type OptimizeResponse = {
  application: {
    atsScore: number;
    companyName: string | null;
    id: string;
    positionTitle: string | null;
    salary: string;
  };
  metadata: {
    mode: "mock" | "openai";
    model: string;
    notes: string[];
  };
};

async function parseResponse<TPayload extends object>(response: Response) {
  const text = await response.text();
  let payload: { error?: string } = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = (payload.error ?? text) || `Optimization failed (${response.status}).`;
    throw new Error(message);
  }

  return payload as TPayload;
}

export function OptimizeForm() {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [positionTitle, setPositionTitle] = useState("");
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [salary, setSalary] = useState("");

  async function optimize(event: FormEvent<HTMLElement>) {
    event.preventDefault();
    setError(null);
    setIsOptimizing(true);

    try {
      const payload = await parseResponse<OptimizeResponse>(
        await fetch("/api/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company, jobDetails, positionTitle, salary })
        })
      );

      setResult(payload);
      router.push(`/applications/${payload.application.id}`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to optimize this application."
      );
    } finally {
      setIsOptimizing(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Panel as="form" className="block" onSubmit={optimize}>
        <div className="grid items-start gap-4 md:grid-cols-2">
          <Field label="Company">
            <TextInput
              onChange={(event) => setCompany(event.currentTarget.value)}
              required
              value={company}
            />
          </Field>
          <Field label="Position title">
            <TextInput
              onChange={(event) => setPositionTitle(event.currentTarget.value)}
              required
              value={positionTitle}
            />
          </Field>
        </div>
        <Field className="mt-4" label="Salary">
          <TextInput
            onChange={(event) => setSalary(event.currentTarget.value)}
            placeholder="Optional"
            value={salary}
          />
        </Field>
        <Field
          helper="Paste the full job responsibilities, requirements, benefits, and any ATS-relevant details."
          htmlFor="job-details-input"
          label="Job details"
        >
          <TextArea
            className="min-h-96"
            id="job-details-input"
            onChange={(event) => setJobDetails(event.currentTarget.value)}
            placeholder="Paste the job details here..."
            required
            value={jobDetails}
          />
        </Field>
        {error ? (
          <Alert className="mt-4" tone="error">
            {error}
          </Alert>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button disabled={isOptimizing} type="submit">
            {isOptimizing ? "Optimizing..." : "Generate Application"}
          </Button>
        </div>
      </Panel>
      <aside className="grid gap-6">
        <ScoreCard
          score={result ? result.application.atsScore.toFixed(1) : "-"}
          summary={
            result
              ? "Application generated and saved with an ATS-friendly CV snapshot and cover letter."
              : "ATS score appears after generation."
          }
        />
        <Panel>
          <h2 className="font-title text-xl uppercase text-rv-text">
            Generation output
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Tag>ATS Ready</Tag>
            <Tag>Application Snapshot</Tag>
          </div>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-bold text-rv-text-soft">Position</dt>
              <dd className="mt-1 text-rv-text-muted">
                {result?.application.positionTitle ?? "Waiting for job description."}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-rv-text-soft">Company</dt>
              <dd className="mt-1 text-rv-text-muted">
                {result?.application.companyName ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-rv-text-soft">Salary</dt>
              <dd className="mt-1 text-rv-text-muted">
                {result?.application.salary || "-"}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-rv-text-soft">Cover letter</dt>
              <dd className="mt-1 text-rv-text-muted">
                {result ? "Generated from your Cover Letter template." : "Generated after optimization."}
              </dd>
            </div>
          </dl>
          <HelperText className="mt-4">
            Generated results are saved to Applications with status Draft.
          </HelperText>
        </Panel>
      </aside>
    </section>
  );
}
