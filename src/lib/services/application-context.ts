export type ApplicationContext = {
  companyContext: string;
  companyUrl: string;
  jobApplicationUrl: string;
  jobContext: string;
};

type ContextMode = "company" | "job";

const maxContextLength = 2400;
const maxCompanyContextLength = 6000;
const maxCompanyPages = 5;
const maxTextLength = 12000;
const maxRedirects = 3;
const requestTimeoutMs = 6000;

export async function extractApplicationContext({
  companyUrl,
  jobApplicationUrl
}: {
  companyUrl?: string;
  jobApplicationUrl?: string;
}): Promise<ApplicationContext> {
  const [companyContext, jobContext] = await Promise.all([
    fetchCompanyContext(companyUrl),
    fetchPublicPageContext(jobApplicationUrl)
  ]);

  return {
    companyContext,
    companyUrl: normalizePublicUrl(companyUrl),
    jobApplicationUrl: normalizePublicUrl(jobApplicationUrl),
    jobContext
  };
}

export function applicationContextToText(context?: Partial<ApplicationContext>) {
  if (!context) {
    return "";
  }

  return [
    context.companyUrl ? `Company URL: ${context.companyUrl}` : "",
    context.companyContext ? `Company context: ${context.companyContext}` : "",
    context.jobApplicationUrl ? `Job application URL: ${context.jobApplicationUrl}` : "",
    context.jobContext ? `Job page context: ${context.jobContext}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

async function fetchPublicPageContext(value?: string) {
  const url = normalizePublicUrl(value);

  if (!url) {
    return "";
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetchValidated(url, controller.signal);

      if (!response.ok) {
        return "";
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (!/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) {
        return "";
      }

      return formatPageContext(url, extractUsefulText(await response.text(), "job"));
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return "";
  }
}

async function fetchCompanyContext(value?: string) {
  const companyUrl = normalizePublicUrl(value);

  if (!companyUrl) {
    return "";
  }

  const homepage = await fetchPublicPage(companyUrl);
  const candidateUrls = rankCompanyUrls([
    companyUrl,
    ...companyPathCandidates(companyUrl),
    ...(homepage?.html ? extractCompanyLinks(homepage.html, companyUrl) : [])
  ]).slice(0, maxCompanyPages);
  const pages = await Promise.all(candidateUrls.map((url) => fetchPublicPage(url)));

  return pages
    .filter((page): page is { html: string; url: string } => Boolean(page))
    .map((page) => formatPageContext(page.url, extractUsefulText(page.html, "company")))
    .filter(Boolean)
    .join("\n\n")
    .slice(0, maxCompanyContextLength);
}

async function fetchPublicPage(value?: string) {
  const url = normalizePublicUrl(value);

  if (!url) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetchValidated(url, controller.signal);

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (!/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) {
        return null;
      }

      return {
        html: await response.text(),
        url
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}

function normalizePublicUrl(value?: string) {
  const rawValue = value?.trim();

  if (!rawValue) {
    return "";
  }

  try {
    const url = new URL(rawValue);

    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    if (isBlockedHostname(url.hostname)) {
      return "";
    }

    url.hash = "";

    return url.toString();
  } catch {
    return "";
  }
}

function companyPathCandidates(companyUrl: string) {
  const url = new URL(companyUrl);
  const paths = [
    "/about",
    "/about-us",
    "/company",
    "/who-we-are",
    "/mission",
    "/values",
    "/culture",
    "/careers",
    "/jobs",
    "/leadership",
    "/team",
    "/our-team"
  ];

  return paths.map((path) => {
    const candidate = new URL(url.origin);
    candidate.pathname = path;

    return candidate.toString();
  });
}

function extractCompanyLinks(html: string, companyUrl: string) {
  const baseUrl = new URL(companyUrl);
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];

  return links
    .map((match) => {
      const href = match[1];
      const label = stripHtml(match[2] ?? "");

      try {
        const url = new URL(href, companyUrl);

        if (url.hostname !== baseUrl.hostname || isBlockedHostname(url.hostname)) {
          return "";
        }

        url.hash = "";

        return isCompanySignalUrl(url.toString(), label) ? normalizePublicUrl(url.toString()) : "";
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

function rankCompanyUrls(values: string[]) {
  return uniqueUrls(values)
    .map((url) => ({ score: companyUrlScore(url), url }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
    .map((item) => item.url);
}

function companyUrlScore(value: string) {
  const url = new URL(value);
  const path = `${url.pathname} ${url.search}`.toLowerCase();

  if (/privacy|terms|cookie|login|signin|cart|checkout|blog|press|news|events|contact|support|docs|documentation/.test(path)) {
    return -1;
  }

  if (/leadership|executive|management/.test(path)) {
    return 90;
  }

  if (/careers|jobs|join-us|work-with-us|life-at/.test(path)) {
    return 85;
  }

  if (/about|about-us|company|who-we-are|mission|values|culture/.test(path)) {
    return 80;
  }

  if (/team|people|our-team/.test(path)) {
    return 75;
  }

  return path === "/" || path === " " ? 50 : 10;
}

function isCompanySignalUrl(url: string, label: string) {
  return companyUrlScore(url) >= 75 || /about|careers|jobs|leadership|team|culture|values|mission|company|who we are/i.test(label);
}

function uniqueUrls(values: string[]) {
  return [...new Set(values.map(normalizePublicUrl).filter(Boolean))];
}

async function fetchValidated(url: string, signal: AbortSignal, redirectCount = 0) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
      "User-Agent": "RoleVector/0.1 (+https://rolevector.local)"
    },
    redirect: "manual",
    signal
  });

  if (isRedirect(response.status) && redirectCount < maxRedirects) {
    const location = response.headers.get("location");
    const nextUrl = normalizeRedirectUrl(location, url);

    if (!nextUrl) {
      return response;
    }

    return fetchValidated(nextUrl, signal, redirectCount + 1);
  }

  return response;
}

function isRedirect(status: number) {
  return [301, 302, 303, 307, 308].includes(status);
}

function normalizeRedirectUrl(location: string | null, baseUrl: string) {
  if (!location) {
    return "";
  }

  try {
    return normalizePublicUrl(new URL(location, baseUrl).toString());
  } catch {
    return "";
  }
}

function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase();

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.includes(":")
  ) {
    return true;
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [first, second] = host.split(".").map(Number);

    return (
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }

  return false;
}

function extractUsefulText(html: string, mode: ContextMode) {
  const clippedHtml = html.slice(0, 500_000);
  const title = matchContent(clippedHtml, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description =
    matchContent(
      clippedHtml,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i
    ) ||
    matchContent(
      clippedHtml,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i
    ) ||
    matchContent(
      clippedHtml,
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i
    );
  const blocks = rankContextBlocks(
    dedupeBlocks([
      ...extractStructuredBlocks(clippedHtml),
      ...extractSentenceBlocks(stripHtml(clippedHtml).slice(0, maxTextLength))
    ]),
    mode
  )
    .slice(0, 8)
    .map((item) => item.text);
  const safeTitle = keepContextLine(title, mode);
  const safeDescription = keepContextLine(description, mode);

  return [
    safeTitle ? `Title: ${safeTitle}` : "",
    safeDescription ? `Description: ${safeDescription}` : "",
    ...blocks
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, maxContextLength);
}

function formatPageContext(url: string, content: string) {
  if (!content) {
    return "";
  }

  return [`Source: ${url}`, content].join("\n");
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) =>
      String.fromCharCode(Number.parseInt(code, 16))
    )
    .replace(/\s+/g, " ")
    .trim()
    ;
}

function matchContent(value: string, pattern: RegExp) {
  return decodeEntities(value.match(pattern)?.[1] ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractStructuredBlocks(html: string) {
  const matches = [
    ...html.matchAll(/<(h1|h2|h3|p|li)[^>]*>([\s\S]*?)<\/\1>/gi)
  ];

  return matches
    .map((match) => stripHtml(decodeEntities(match[2] ?? "")))
    .filter(Boolean);
}

function extractSentenceBlocks(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function dedupeBlocks(values: string[]) {
  return [...new Set(values.map(normalizeWhitespace).filter(Boolean))];
}

function rankContextBlocks(values: string[], mode: ContextMode) {
  return values
    .map((text) => ({
      score: contextBlockScore(text, mode),
      text
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.text.localeCompare(b.text));
}

function keepContextLine(value: string, mode: ContextMode) {
  const line = normalizeWhitespace(decodeEntities(value));

  return contextBlockScore(line, mode) > 0 ? line : "";
}

function contextBlockScore(value: string, mode: ContextMode) {
  const text = normalizeWhitespace(value);
  const normalized = text.toLowerCase();

  if (!text || text.length < 35 || text.length > 320) {
    return -1;
  }

  if (irrelevantContextPatterns.some((pattern) => pattern.test(normalized))) {
    return -3;
  }

  let score = 0;

  if (mode === "job") {
    if (/\bresponsibilit|qualification|requirement|must have|preferred|nice to have\b/.test(normalized)) {
      score += 4;
    }

    if (/\bexperience with|proficien|build|develop|design|lead|maintain|support|collaborate|mentor|own\b/.test(normalized)) {
      score += 3;
    }

    if (/\breact|next\.js|typescript|graphql|node\.js|api|cms|drupal|figma|accessibility|docker|kubernetes|postgresql|prisma\b/.test(normalized)) {
      score += 3;
    }
  }

  if (mode === "company") {
    if (/\bcompany|team|culture|mission|values|customers|platform|products?|services?\b/.test(normalized)) {
      score += 3;
    }

    if (/\bbuild|develop|deliver|support|serve|work with|partner with\b/.test(normalized)) {
      score += 2;
    }

    if (/\bengineering|technology|digital|software|design|content|data\b/.test(normalized)) {
      score += 2;
    }
  }

  if (/\bunited states\b|\btoday'?s top \d+\b|\bsearch options\b|\bprofessional network\b/.test(normalized)) {
    score -= 4;
  }

  return score;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) =>
      String.fromCharCode(Number.parseInt(code, 16))
    );
}

const irrelevantContextPatterns = [
  /\bsearch options\b/,
  /\bwhen expanded it provides a list\b/,
  /\btoday'?s top \d+\b/,
  /\bleverage your professional network\b/,
  /\bnew .* jobs added daily\b/,
  /\bskip to main content\b/,
  /\bsign in\b/,
  /\bjoin now\b/,
  /\bcookie\b/,
  /\bprivacy policy\b/,
  /\bterms of use\b/,
  /\ball rights reserved\b/,
  /\buse left and right arrow\b/,
  /\bshow more\b/,
  /\bread more\b/,
  /\bapply now\b/,
  /\beasy apply\b/,
  /\bloading\b/,
  /\bpage not found\b/,
  /\bjob alert\b/,
  /\bmatches your preferences\b/
];
