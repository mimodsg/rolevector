"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PreviewTab = {
  content: ReactNode;
  id: string;
  label: string;
};

export function ApplicationPreviewTabs({ tabs }: { tabs: PreviewTab[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");
  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <section>
      <div
        aria-label="Application sections"
        className="flex gap-6 overflow-x-auto rounded-rvlg border border-rv-border bg-rv-surface px-5"
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            aria-controls={`${tab.id}-panel`}
            aria-selected={tab.id === selectedTab.id}
            className={cn(
              "relative whitespace-nowrap py-4 font-title text-xs font-medium uppercase tracking-wide text-rv-text-muted transition hover:text-rv-text",
              tab.id === selectedTab.id &&
                "text-rv-text after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-rv-primary"
            )}
            id={`${tab.id}-tab`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        aria-labelledby={`${selectedTab.id}-tab`}
        className="mt-6"
        id={`${selectedTab.id}-panel`}
        role="tabpanel"
      >
        {selectedTab.content}
      </div>
    </section>
  );
}
