import { AppShell } from "@/components/app-shell";

export default function OptimizePage() {
  return (
    <AppShell title="Optimize CV">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form className="rounded-md border border-[#d9deea] bg-white p-5 shadow-sm">
          <label
            className="text-sm font-semibold text-[#24324a]"
            htmlFor="job-description-input"
          >
            Job description
          </label>
          <textarea
            className="mt-3 min-h-96 w-full resize-y rounded-md border border-[#c7cfdd] bg-white p-4 text-sm leading-6 outline-none focus:border-[#1f6f5b] focus:ring-2 focus:ring-[#1f6f5b]/20"
            id="job-description-input"
            placeholder="Paste the role description here..."
          />
          <button
            className="mt-4 rounded-md bg-[#1f6f5b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#185847]"
            type="button"
          >
            Optimize CV for Position
          </button>
        </form>
        <aside className="rounded-md border border-[#d9deea] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Generation output</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-semibold">Parsed metadata</dt>
              <dd className="mt-1 text-[#4d5b6f]">Waiting for job description.</dd>
            </div>
            <div>
              <dt className="font-semibold">ATS score</dt>
              <dd className="mt-1 text-[#4d5b6f]">-</dd>
            </div>
            <div>
              <dt className="font-semibold">Cover letter</dt>
              <dd className="mt-1 text-[#4d5b6f]">Generated after optimization.</dd>
            </div>
          </dl>
        </aside>
      </section>
    </AppShell>
  );
}
