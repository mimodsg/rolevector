export const appShellStyles = {
  main: "min-h-screen text-rv-text",
  header:
    "mx-auto mt-4 w-[min(1440px,calc(100%_-_2rem))] rounded-rvlg border border-rv-border bg-rv-surface shadow-rvsm backdrop-blur",
  headerInner:
    "flex min-h-16 flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between",
  brand:
    "inline-flex items-center gap-3 font-title text-xl font-medium uppercase text-rv-text",
  brandMark:
    "grid size-9 place-items-center rounded-rvmd bg-[linear-gradient(135deg,var(--color-primary),var(--color-purple))] font-title text-base font-medium text-rv-text shadow-rvsm",
  headerActions: "flex flex-wrap items-center gap-4",
  nav: "flex flex-wrap items-center gap-3",
  navLink:
    "relative rounded-rvsm border border-transparent px-2 py-2 text-xs font-bold text-rv-text-muted transition hover:text-rv-text",
  avatar:
    "grid size-9 place-items-center rounded-full border border-rv-primary bg-rv-primary text-xs font-extrabold text-rv-text",
  content: "mx-auto flex w-[min(1440px,calc(100%_-_2rem))] flex-col gap-6 py-8",
  titleRow:
    "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
  title: "font-title text-4xl font-medium uppercase text-rv-text"
};
