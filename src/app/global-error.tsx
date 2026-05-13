"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center px-6 text-rv-text">
          <section className="max-w-xl rounded-rvlg border border-rv-border bg-[linear-gradient(145deg,var(--color-surface),rgba(30,41,59,0.72))] p-6 shadow-rvmd">
            <p className="inline-flex w-fit rounded-rvsm border border-rv-error bg-rv-error-soft px-3 py-1 text-xs font-bold text-rv-error">
              Application error
            </p>
            <h1 className="mt-4 font-title text-4xl font-medium uppercase text-rv-text">
              Something failed
            </h1>
            <p className="mt-3 text-sm leading-6 text-rv-text-muted">
              {error.message || "The application hit an unexpected error."}
            </p>
            <button
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-rvmd border border-transparent bg-rv-primary px-4 py-2.5 text-sm font-bold text-rv-text transition hover:bg-rv-primary-dark focus:outline-none focus:ring-2 focus:ring-rv-primary-soft"
              onClick={reset}
              type="button"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
