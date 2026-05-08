"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { HelperText, SectionTitle } from "@/components/ui/typography";
import { coverLetterTokens } from "@/lib/cover-letter-template";

async function parseResponse<TPayload extends object>(response: Response) {
  const text = await response.text();
  let payload: { error?: string } = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = (payload.error ?? text) || `The cover letter request failed (${response.status}).`;
    throw new Error(message);
  }

  return payload as TPayload;
}

export function CoverLetterEditor({ initialContent }: { initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<{
    message: string;
    tone: "success" | "warning" | "error";
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTokenLegendOpen, setIsTokenLegendOpen] = useState(false);

  async function saveTemplate(event: FormEvent<HTMLElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSaving(true);

    try {
      const payload = await parseResponse<{ template: { content: string } }>(
        await fetch("/api/cover-letter", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content })
        })
      );

      setContent(payload.template.content);
      setStatus({ message: "Cover letter template saved.", tone: "success" });
    } catch (error) {
      setStatus({
        message: error instanceof Error ? error.message : "Unable to save cover letter template.",
        tone: "error"
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTemplate() {
    setStatus(null);
    setIsDeleting(true);

    try {
      await parseResponse<{ ok: boolean }>(
        await fetch("/api/cover-letter", {
          method: "DELETE"
        })
      );
      setContent("");
      setStatus({ message: "Cover letter template deleted.", tone: "warning" });
    } catch (error) {
      setStatus({
        message: error instanceof Error ? error.message : "Unable to delete cover letter template.",
        tone: "error"
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Panel as="form" onSubmit={saveTemplate}>
      <div className="sticky top-0 z-20 -mx-5 -mt-5 border-b border-rv-border bg-rv-surface/95 px-5 pb-4 pt-5 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionTitle className="text-2xl md:text-3xl">Cover Letter</SectionTitle>
            <HelperText className="mt-2">
              Store the reusable template used when generating optimized applications.
            </HelperText>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save template"}
            </Button>
            <Button disabled={isDeleting} onClick={deleteTemplate} type="button" variant="ghost">
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

      <section className="mt-6">
        <HelperText className="mb-3">
          Use bracketed tokens where RoleVector should inject application and Master CV data.
        </HelperText>
        <div className="mb-5 rounded-rvmd border border-rv-border bg-rv-bg/40 p-4">
          <button
            className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
            onClick={() => setIsTokenLegendOpen((current) => !current)}
            type="button"
          >
            <span>
              <h3 className="font-title text-lg uppercase text-rv-highlight">
                Available Tokens
              </h3>
              <span className="mt-1 block text-sm font-normal text-rv-text-muted">
                {coverLetterTokens.length} placeholders available
              </span>
            </span>
            <span className="text-sm font-bold text-rv-text-muted">
              {isTokenLegendOpen ? "Collapse" : "Expand"}
            </span>
          </button>

          {isTokenLegendOpen ? (
            <dl className="mt-3 grid items-start gap-3 border-t border-rv-border pt-3 md:grid-cols-2">
              {coverLetterTokens.map((item) => (
                <div className="grid gap-1" key={item.token}>
                  <dt className="font-mono text-sm font-bold text-rv-text">{item.token}</dt>
                  <dd className="text-sm text-rv-text-muted">{item.description}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        <Field label="Template content">
          <TextArea
            className="min-h-[520px]"
            onChange={(event) => setContent(event.currentTarget.value)}
            value={content}
          />
        </Field>
      </section>
    </Panel>
  );
}
