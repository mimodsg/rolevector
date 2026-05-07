const workflow = [
  "Build a truthful master CV",
  "Paste a job description",
  "Generate an ATS-safe application",
  "Track score and history"
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-6 py-8 text-[#172033]">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-[#d9deea] pb-6">
          <p className="text-sm font-semibold uppercase text-[#41617d]">
            RoleVector
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                ATS CV optimizer
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#4d5b6f]">
                Local-first workspace for maintaining a master CV, generating
                tailored applications, and preserving each generated snapshot.
              </p>
            </div>
            <a
              className="inline-flex w-fit items-center justify-center rounded-md bg-[#1f6f5b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#185847]"
              href="#job-description"
            >
              Start optimization
            </a>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          {workflow.map((item, index) => (
            <div
              className="rounded-md border border-[#d9deea] bg-white p-4 shadow-sm"
              key={item}
            >
              <p className="text-sm font-semibold text-[#41617d]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-3 text-sm font-medium leading-6">{item}</p>
            </div>
          ))}
        </div>

        <section
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
          id="job-description"
        >
          <form className="rounded-md border border-[#d9deea] bg-white p-5 shadow-sm">
            <label
              className="text-sm font-semibold text-[#24324a]"
              htmlFor="job-description-input"
            >
              Job description
            </label>
            <textarea
              className="mt-3 min-h-80 w-full resize-y rounded-md border border-[#c7cfdd] bg-white p-4 text-sm leading-6 outline-none transition focus:border-[#1f6f5b] focus:ring-2 focus:ring-[#1f6f5b]/20"
              id="job-description-input"
              placeholder="Paste the role description here..."
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded-md bg-[#1f6f5b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#185847]"
                type="button"
              >
                Optimize CV for Position
              </button>
              <button
                className="rounded-md border border-[#c7cfdd] px-4 py-2.5 text-sm font-semibold text-[#24324a] transition hover:bg-[#eef2f7]"
                type="button"
              >
                Save draft
              </button>
            </div>
          </form>

          <aside className="rounded-md border border-[#d9deea] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">MVP modules</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#4d5b6f]">
              <li>Authentication and session management</li>
              <li>Master CV CRUD with structured JSON</li>
              <li>OpenAI parsing and optimization services</li>
              <li>Application history with ATS score tracking</li>
              <li>Puppeteer PDF export from ATS-safe templates</li>
            </ul>
          </aside>
        </section>
      </section>
    </main>
  );
}
