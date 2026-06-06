"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Alert, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Panel } from "@/components/ui/panel";
import { HelperText, SectionTitle } from "@/components/ui/typography";
import type { MasterCv } from "@/lib/schemas/master-cv";
import type {
  OptimizedMasterCvRecord,
  OptimizedMasterCvSuggestions
} from "@/lib/services/optimized-master-cv";

async function parseResponse<TPayload extends object>(response: Response) {
  const text = await response.text();
  let payload: { error?: string } = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = (payload.error ?? text) || `The request failed (${response.status}).`;
    throw new Error(message);
  }

  return payload as TPayload;
}

function formatDate(value: string | Date | null) {
  if (!value) {
    return "Not promoted";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function allSuggestionIds(suggestions: OptimizedMasterCvSuggestions) {
  return [
    ...suggestions.skillsMissing.map((item) => item.id),
    ...suggestions.skillsToRemove.map((item) => item.id),
    ...suggestions.editorialUpdates.map((item) => item.id)
  ];
}

export function OptimizedMasterCvWorkbench({
  masterCv,
  optimizedMasterCvs,
  suggestions
}: {
  masterCv: MasterCv | null;
  optimizedMasterCvs: OptimizedMasterCvRecord[];
  suggestions: OptimizedMasterCvSuggestions | null;
}) {
  const router = useRouter();
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>(
    suggestions ? allSuggestionIds(suggestions) : []
  );
  const [status, setStatus] = useState<{
    message: string;
    tone: "success" | "warning" | "error";
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (!masterCv || !suggestions) {
    return (
      <Panel>
        <SectionTitle>Create A Master CV First</SectionTitle>
        <HelperText className="mt-2">
          Save a canonical Master CV before creating optimized versions.
        </HelperText>
      </Panel>
    );
  }

  const latestOptimized = optimizedMasterCvs.find((item) => item.isMain) ?? null;
  const hasSelections = selectedSuggestionIds.length > 0;

  function toggleSelection(id: string) {
    setSelectedSuggestionIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function createOptimizedVersion() {
    setStatus(null);
    setIsCreating(true);

    try {
      await parseResponse<{ optimizedMasterCv: OptimizedMasterCvRecord }>(
        await fetch("/api/master-cv/optimized", {
          body: JSON.stringify({ selectedSuggestionIds }),
          headers: { "Content-Type": "application/json" },
          method: "POST"
        })
      );

      setStatus({
        message: "Optimized Master CV saved as the new main optimized version.",
        tone: "success"
      });
      router.refresh();
    } catch (error) {
      setStatus({
        message:
          error instanceof Error
            ? error.message
            : "Unable to create an optimized Master CV version.",
        tone: "error"
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function promoteLatestOptimized() {
    if (!latestOptimized) {
      return;
    }

    setStatus(null);
    setIsPromoting(true);
    setIsConfirmOpen(false);

    try {
      await parseResponse<{ ok: true }>(
        await fetch("/api/master-cv/optimized", {
          body: JSON.stringify({ optimizedMasterCvId: latestOptimized.id }),
          headers: { "Content-Type": "application/json" },
          method: "PUT"
        })
      );

      setStatus({
        message: "Master CV replaced with the latest optimized version.",
        tone: "warning"
      });
      router.refresh();
    } catch (error) {
      setStatus({
        message:
          error instanceof Error ? error.message : "Unable to replace the Master CV.",
        tone: "error"
      });
    } finally {
      setIsPromoting(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="grid gap-6">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <SectionTitle>Suggestion Review</SectionTitle>
                <HelperText className="mt-2">
                  Suggestions are derived from the skills already attached to experience and projects.
                  Select the edits you want in the optimized version.
                </HelperText>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={!hasSelections || isCreating}
                  onClick={createOptimizedVersion}
                  type="button"
                >
                  {isCreating ? "Saving..." : "Create optimized version"}
                </Button>
                <Button
                  disabled={!latestOptimized || isPromoting}
                  onClick={() => setIsConfirmOpen(true)}
                  type="button"
                  variant="highlight"
                >
                  {isPromoting ? "Replacing..." : "Replace master CV"}
                </Button>
              </div>
            </div>

            {status ? (
              <Alert className="mt-5" tone={status.tone}>
                {status.message}
              </Alert>
            ) : null}
          </Panel>

          <SuggestionPanel
            count={suggestions.skillsMissing.length}
            title="Suggested Skills To Add"
          >
            {suggestions.skillsMissing.length === 0 ? (
              <EmptySuggestionState message="No missing skills were inferred from the current experience and project content." />
            ) : (
              suggestions.skillsMissing.map((suggestion) => (
                <SuggestionToggle
                  checked={selectedSuggestionIds.includes(suggestion.id)}
                  description={suggestion.reason}
                  key={suggestion.id}
                  onToggle={() => toggleSelection(suggestion.id)}
                  title={suggestion.skill}
                >
                  <p className="text-xs text-rv-text-muted">
                    Evidence: {suggestion.evidence.join(", ")}
                  </p>
                </SuggestionToggle>
              ))
            )}
          </SuggestionPanel>

          <SuggestionPanel
            count={suggestions.skillsToRemove.length}
            title="Suggested Skills To Remove"
          >
            {suggestions.skillsToRemove.length === 0 ? (
              <EmptySuggestionState message="All listed top-level skills have supporting evidence in experience or projects." />
            ) : (
              suggestions.skillsToRemove.map((suggestion) => (
                <SuggestionToggle
                  checked={selectedSuggestionIds.includes(suggestion.id)}
                  description={suggestion.reason}
                  key={suggestion.id}
                  onToggle={() => toggleSelection(suggestion.id)}
                  title={suggestion.skill}
                />
              ))
            )}
          </SuggestionPanel>

          <SuggestionPanel
            count={suggestions.editorialUpdates.length}
            title="Editorial Updates"
          >
            {suggestions.editorialUpdates.length === 0 ? (
              <EmptySuggestionState message="Experience and project descriptions are already aligned with the captured facts." />
            ) : (
              suggestions.editorialUpdates.map((suggestion) => (
                <SuggestionToggle
                  checked={selectedSuggestionIds.includes(suggestion.id)}
                  description={suggestion.reason}
                  key={suggestion.id}
                  onToggle={() => toggleSelection(suggestion.id)}
                  title={suggestion.entityLabel}
                >
                  <div className="grid gap-3 text-xs text-rv-text-muted md:grid-cols-2">
                    <div>
                      <p className="font-bold uppercase tracking-[0.08em] text-rv-text">Current</p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {suggestion.currentText || "No description yet."}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-[0.08em] text-rv-text">Suggested</p>
                      <p className="mt-1 whitespace-pre-wrap">{suggestion.suggestedText}</p>
                    </div>
                  </div>
                </SuggestionToggle>
              ))
            )}
          </SuggestionPanel>
        </div>

        <div className="grid gap-6">
          <Panel>
            <SectionTitle className="text-2xl">Version Summary</SectionTitle>
            <div className="mt-4 grid gap-3 text-sm text-rv-text-muted">
              <p>Current curated Master CV: 1 canonical version.</p>
              <p>Optimized versions stored: {optimizedMasterCvs.length}.</p>
              <p>Selected suggestions: {selectedSuggestionIds.length}.</p>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <SectionTitle className="text-2xl">Optimized Versions</SectionTitle>
              {latestOptimized ? <Tag>Main version</Tag> : null}
            </div>
            <div className="mt-4 grid gap-3">
              {optimizedMasterCvs.length === 0 ? (
                <HelperText>No optimized Master CV versions yet.</HelperText>
              ) : (
                optimizedMasterCvs.map((item) => (
                  <div
                    className="rounded-rvmd border border-rv-border bg-rv-bg/40 p-4"
                    key={item.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-rv-text">Revision {item.revisionNumber}</p>
                      <Tag>{item.isMain ? "Main optimized" : "Revision"}</Tag>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-rv-text-muted">
                      <p>Created: {formatDate(item.createdAt)}</p>
                      <p>Applied suggestions: {item.appliedSuggestionIds.length}</p>
                      <p>Promoted to master: {formatDate(item.promotedAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      <ConfirmModal
        cancelLabel="Keep current master"
        confirmLabel="Replace master CV"
        description="This replaces the current Master CV with the latest optimized version. The previous Master CV is not recoverable from this action."
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={promoteLatestOptimized}
        title="Replace Master CV"
      />
    </>
  );
}

function SuggestionPanel({
  children,
  count,
  title
}: {
  children: ReactNode;
  count: number;
  title: string;
}) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-3">
        <SectionTitle className="text-2xl">{title}</SectionTitle>
        <Tag>{count}</Tag>
      </div>
      <div className="mt-4 grid gap-3">{children}</div>
    </Panel>
  );
}

function SuggestionToggle({
  checked,
  children,
  description,
  onToggle,
  title
}: {
  checked: boolean;
  children?: ReactNode;
  description: string;
  onToggle: () => void;
  title: string;
}) {
  return (
    <label className="block cursor-pointer rounded-rvmd border border-rv-border bg-rv-bg/40 p-4">
      <div className="flex items-start gap-3">
        <input
          checked={checked}
          className="mt-1 h-4 w-4 accent-[var(--color-highlight)]"
          onChange={onToggle}
          type="checkbox"
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-rv-text">{title}</p>
          <p className="mt-1 text-sm text-rv-text-muted">{description}</p>
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </label>
  );
}

function EmptySuggestionState({ message }: { message: string }) {
  return (
    <div className="rounded-rvmd border border-dashed border-rv-border bg-rv-bg/20 p-4">
      <HelperText>{message}</HelperText>
    </div>
  );
}
