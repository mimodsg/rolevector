import type { MasterCv } from "../schemas/master-cv";
import { parsedJobSchema, type ParsedJob } from "../schemas/job.ts";

const atsPhrasePatterns = [
  /\bdesign systems?\b/gi,
  /\bcomponent libraries?\b/gi,
  /\bcontent management systems?\b/gi,
  /\bheadless cms\b/gi,
  /\bweb accessibility\b/gi,
  /\btechnical leadership\b/gi,
  /\bfull[- ]stack\b/gi,
  /\bfrontend architecture\b/gi,
  /\bbackend services?\b/gi,
  /\bapi integrations?\b/gi,
  /\bperformance optimization\b/gi,
  /\bweb performance\b/gi,
  /\bcross-functional collaboration\b/gi,
  /\bunit testing\b/gi
] as const;

type SectionKind =
  | "required"
  | "preferred"
  | "responsibility"
  | "constraint"
  | "ignored"
  | "other";

type SkillDictionary = {
  canonicalByNormalized: Map<string, string>;
  normalizedSkills: string[];
};

export function parseJobDescription({
  company,
  jobDetails,
  masterCv,
  positionTitle,
  salary
}: {
  company?: string;
  jobDetails: string;
  masterCv?: MasterCv;
  positionTitle?: string;
  salary?: string;
}): ParsedJob {
  const lines = jobDetails
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const classifiedLines = classifyLines(lines);
  const requiredLines = classifiedLines
    .filter((item) => item.kind === "required")
    .map((item) => item.text);
  const preferredLines = classifiedLines
    .filter((item) => item.kind === "preferred")
    .map((item) => item.text);
  const responsibilityLines = classifiedLines
    .filter((item) => item.kind === "responsibility")
    .map((item) => item.text)
    .slice(0, 12);
  const constraintLines = classifiedLines
    .filter((item) => item.kind === "constraint")
    .map((item) => item.text)
    .slice(0, 8);
  const resolvedPositionTitle = resolvePositionTitle(lines, positionTitle);
  const resolvedCompany = resolveCompany(lines, company);
  const normalizedDetails = normalize(jobDetails);
  const skillDictionary = buildSkillDictionary(masterCv);
  const location = extractLocation(lines);
  const seniority = extractSeniority([resolvedPositionTitle, jobDetails].join("\n"));
  const alternativeRequirementGroups = extractAlternativeRequirementGroups(
    requiredLines,
    skillDictionary
  );
  const requiredSkills = unique([
    ...extractSkillsFromText(resolvedPositionTitle, skillDictionary),
    ...extractSkillsFromLines(requiredLines, skillDictionary),
    ...extractRequiredSkillHints(requiredLines, skillDictionary),
    ...extractContextualSkillHints(requiredLines, skillDictionary),
    ...alternativeRequirementGroups.flatMap((group) => group.items)
  ]).slice(0, 14);
  const preferredSkills = unique([
    ...extractSkillsFromLines(preferredLines, skillDictionary),
    ...extractPreferredSkillHints(preferredLines, skillDictionary),
    ...extractContextualSkillHints(preferredLines, skillDictionary)
  ])
    .filter((skill) => !requiredSkills.some((required) => sameSkill(required, skill)))
    .slice(0, 12);
  const keywords = unique([
    ...requiredSkills,
    ...preferredSkills,
    ...extractAtsPhrases(
      [
        resolvedPositionTitle,
        ...requiredLines,
        ...preferredLines,
        ...responsibilityLines
      ].join("\n")
    ),
    ...extractRoleKeywords(resolvedPositionTitle, normalizedDetails)
  ]).slice(0, 20);

  return parsedJobSchema.parse({
    company_name: resolvedCompany || null,
    position_title: resolvedPositionTitle || null,
    salary: salary || null,
    location,
    seniority,
    required_skills: requiredSkills,
    preferred_skills: preferredSkills,
    responsibilities: responsibilityLines,
    keywords,
    constraint_clauses: constraintLines,
    alternative_requirement_groups: alternativeRequirementGroups
  });
}

function resolvePositionTitle(lines: string[], providedTitle?: string) {
  if (providedTitle?.trim()) {
    return providedTitle.trim();
  }

  const labeledMatch = lines
    .slice(0, 10)
    .map(
      (line) =>
        line.match(/^(?:job title|position title|title|role)\s*:\s*(.+)$/i)?.[1]?.trim()
    )
    .find(Boolean);

  if (labeledMatch) {
    return labeledMatch;
  }

  const headingCandidate = lines.find((line) => roleTitleCandidate(line));

  return headingCandidate ? cleanPhrase(headingCandidate) : "";
}

function resolveCompany(lines: string[], providedCompany?: string) {
  if (providedCompany?.trim()) {
    return providedCompany.trim();
  }

  const labeledMatch = lines
    .slice(0, 12)
    .map((line) => line.match(/^(?:company|organization|employer)\s*:\s*(.+)$/i)?.[1]?.trim())
    .find(Boolean);

  if (labeledMatch) {
    return labeledMatch;
  }

  const aboutMatch = lines
    .slice(0, 20)
    .map((line) => line.match(/^about\s+(.+)$/i)?.[1]?.trim())
    .find((value) => Boolean(value) && value!.split(/\s+/).length <= 6);

  if (aboutMatch) {
    return aboutMatch;
  }

  const atMatch = lines
    .slice(0, 20)
    .map((line) => line.match(/\b(?:join|work at|at)\s+([A-Z][A-Za-z0-9&.,' -]{1,50})/)?.[1]?.trim())
    .find(Boolean);

  return atMatch ?? "";
}

function buildSkillDictionary(masterCv?: MasterCv): SkillDictionary {
  const canonicalByNormalized = new Map<string, string>();

  if (!masterCv) {
    return { canonicalByNormalized, normalizedSkills: [] };
  }

  const skills = unique([
    ...masterCv.frontend_expertise,
    ...masterCv.hard_skills,
    ...masterCv.soft_skills,
    ...masterCv.technical_skills.languages,
    ...masterCv.technical_skills.frameworks,
    ...masterCv.technical_skills.cms,
    ...masterCv.technical_skills.tools,
    ...masterCv.hidden_context.keywords,
    ...masterCv.hidden_context.additional_experience,
    ...masterCv.work_experience.flatMap((item) => [
      ...item.hard_skills,
      ...item.soft_skills,
      ...item.programming_languages,
      ...item.frameworks,
      ...item.cms,
      ...item.tools
    ])
  ]);

  for (const skill of skills) {
    const normalized = normalize(skill);

    if (!normalized || canonicalByNormalized.has(normalized)) {
      continue;
    }

    canonicalByNormalized.set(normalized, skill);
  }

  return {
    canonicalByNormalized,
    normalizedSkills: [...canonicalByNormalized.keys()].sort(
      (a, b) => b.length - a.length || a.localeCompare(b)
    )
  };
}

function classifyLines(lines: string[]) {
  const classified: Array<{ kind: SectionKind; text: string }> = [];
  let section: SectionKind = "other";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = sectionHeading(line);

    if (heading) {
      section = heading.kind;

      if (heading.remainder && shouldCaptureLine(heading.remainder, section)) {
        classified.push({
          kind: inferLineKind(heading.remainder, section),
          text: cleanBullet(heading.remainder)
        });
      }

      continue;
    }

    if (!shouldCaptureLine(line, section)) {
      continue;
    }

    const inferredKind = inferLineKind(line, section);
    classified.push({
      kind: inferredKind,
      text: cleanBullet(line)
    });
  }

  return classified;
}

function sectionHeading(line: string): { kind: SectionKind; remainder: string } | null {
  const requiredHeading = line.match(
    /^(requirements|required qualifications|minimum qualifications|qualifications|desired skills(?: and experience)?|skills(?: and experience)?|must have|what you bring|what we're looking for)[:\s-]*(.*)$/i
  );

  if (requiredHeading) {
    return {
      kind: "required",
      remainder: cleanBullet(requiredHeading[1] ? requiredHeading[2] ?? "" : "")
    };
  }

  const preferredHeading = line.match(
    /^(preferred qualifications|nice to have|bonus points|preferred|pluses|nice to haves?)[:\s-]*(.*)$/i
  );

  if (preferredHeading) {
    return {
      kind: "preferred",
      remainder: cleanBullet(preferredHeading[1] ? preferredHeading[2] ?? "" : "")
    };
  }

  const responsibilityHeading = line.match(
    /^(responsibilities|what you'll do|what you will do|your responsibilities|duties)[:\s-]*(.*)$/i
  );

  if (responsibilityHeading) {
    return {
      kind: "responsibility",
      remainder: cleanBullet(responsibilityHeading[1] ? responsibilityHeading[2] ?? "" : "")
    };
  }

  const constraintHeading = line.match(
    /^(eligibility requirements|eligibility|work arrangement|availability|legal authorization|location requirements?)[:\s-]*(.*)$/i
  );

  if (constraintHeading) {
    return {
      kind: "constraint",
      remainder: cleanBullet(constraintHeading[1] ? constraintHeading[2] ?? "" : "")
    };
  }

  if (ignoredSectionHeading(line)) {
    return {
      kind: "ignored",
      remainder: ""
    };
  }

  return null;
}

function inferLineKind(line: string, currentSection: SectionKind): SectionKind {
  if (currentSection !== "other") {
    return currentSection;
  }

  if (
    /(must have|required|requirement|minimum qualification|experience with|proficiency in|proficient in|familiarity with|knowledge of|expertise in|background in|working on|working with)/i.test(
      line
    )
  ) {
    return "required";
  }

  if (/(preferred|nice to have|bonus|plus)/i.test(line)) {
    return "preferred";
  }

  if (
    /\b(authori[sz]ed to work|work authorization|eligibility|visa|citizen|citizenship|resident|clearance|location|remote|hybrid|on-site|onsite|availability)\b/i.test(
      line
    )
  ) {
    return "constraint";
  }

  if (
    /\b(responsible for|you will|build|develop|lead|design|maintain|support|collaborate|mentor|own)\b/i.test(
      line
    )
  ) {
    return "responsibility";
  }

  return "other";
}

function shouldCaptureLine(line: string, currentSection: SectionKind) {
  if (!line.trim()) {
    return false;
  }

  if (currentSection === "ignored") {
    return false;
  }

  if (currentSection !== "other") {
    return true;
  }

  return isCandidateContentLine(line);
}

function extractLocation(lines: string[]) {
  return (
    lines.find((line) =>
      /remote|hybrid|onsite|on-site|new york|san francisco|austin|chicago|seattle|los angeles|boston/i.test(
        line
      )
    ) ?? null
  );
}

function extractSeniority(value: string) {
  return value.match(/\b(junior|mid|senior|staff|principal|lead)\b/i)?.[0] ?? null;
}

function extractSkillsFromLines(lines: string[], skillDictionary: SkillDictionary) {
  return unique(lines.flatMap((line) => extractSkillsFromText(line, skillDictionary)));
}

function extractSkillsFromText(value: string, skillDictionary: SkillDictionary) {
  const normalizedText = normalize(value);

  return unique(
    skillDictionary.normalizedSkills
      .filter((skill) => normalizedText.includes(skill))
      .map((skill) => skillDictionary.canonicalByNormalized.get(skill) ?? "")
      .filter(Boolean)
  );
}

function extractRequiredSkillHints(lines: string[], skillDictionary: SkillDictionary) {
  return unique(
    lines.flatMap((line) =>
      extractCommaSeparatedPhrases(line)
        .map((phrase) => canonicalizeOrFormatSkill(phrase, skillDictionary))
        .filter((phrase) => likelySkillPhrase(phrase))
    )
  );
}

function extractPreferredSkillHints(lines: string[], skillDictionary: SkillDictionary) {
  return unique(
    lines.flatMap((line) =>
      extractCommaSeparatedPhrases(line)
        .map((phrase) => canonicalizeOrFormatSkill(phrase, skillDictionary))
        .filter((phrase) => likelySkillPhrase(phrase))
    )
  );
}

function extractContextualSkillHints(lines: string[], skillDictionary: SkillDictionary) {
  return unique(
    lines.flatMap((line) =>
      extractContextualPhrases(line)
        .map((phrase) => canonicalizeOrFormatSkill(phrase, skillDictionary))
        .filter((phrase) => likelySkillPhrase(phrase))
    )
  );
}

function canonicalizeOrFormatSkill(value: string, skillDictionary: SkillDictionary) {
  const cleaned = cleanPhrase(value);
  const normalized = normalize(cleaned);

  if (!normalized) {
    return "";
  }

  const aliased = phraseAliases.get(normalized);

  if (aliased) {
    return aliased;
  }

  const exact = skillDictionary.canonicalByNormalized.get(normalized);

  if (exact) {
    return exact;
  }

  const contained = skillDictionary.normalizedSkills.find(
    (skill) =>
      skill === normalized ||
      (normalized.length >= 3 && (normalized.includes(skill) || skill.includes(normalized)))
  );

  if (contained) {
    return skillDictionary.canonicalByNormalized.get(contained) ?? formatSkillPhrase(cleaned);
  }

  return formatSkillPhrase(cleaned);
}

function extractAtsPhrases(value: string) {
  const phrases = atsPhrasePatterns.flatMap((pattern) =>
    [...value.matchAll(pattern)].map((match) => titleCase(match[0] ?? ""))
  );

  return unique(phrases);
}

function extractRoleKeywords(positionTitle: string, normalizedDetails: string) {
  const keywords = [];

  if (/\bfrontend\b|\breact\b|\bui\b/.test(normalize(positionTitle))) {
    keywords.push("Frontend");
  }

  if (/\bbackend\b|\bnode\b|\bapi\b/.test(normalize(positionTitle))) {
    keywords.push("Backend");
  }

  if (/\bapi\b|\bapis\b/.test(normalizedDetails)) {
    keywords.push("API");
  }

  if (/\bfull stack\b|\bfullstack\b/.test(normalizedDetails)) {
    keywords.push("Full Stack");
  }

  if (/\bdesign systems?\b/.test(normalizedDetails)) {
    keywords.push("Design Systems");
  }

  if (/\bcontent management systems?\b|\bcms\b/.test(normalizedDetails)) {
    keywords.push("CMS");
  }

  if (/\baccessibility\b/.test(normalizedDetails)) {
    keywords.push("Accessibility");
  }

  return keywords;
}

function roleTitleCandidate(line: string) {
  if (line.length < 4 || line.length > 90) {
    return false;
  }

  if (
    /[:|]/.test(line) &&
    !/(developer|engineer|designer|manager|architect|consultant|specialist|analyst|administrator|lead|director|editor|strategist)/i.test(
      line
    )
  ) {
    return false;
  }

  return /\b(developer|engineer|designer|manager|architect|consultant|specialist|analyst|administrator|lead|director|editor|strategist)\b/i.test(
    line
  );
}

function extractCommaSeparatedPhrases(line: string) {
  return line
    .replace(/^(must have|required|preferred|nice to have|bonus points?)[:\s-]*/i, "")
    .split(/,|;|\/|\band\b/gi)
    .map((part) => cleanPhrase(part))
    .filter(Boolean)
    .slice(0, 8);
}

function extractContextualPhrases(line: string) {
  const cleanedLine = cleanBullet(line);
  const matches = [
    ...cleanedLine.matchAll(
      /\b(?:experience(?:\s+working)?\s+(?:with|on)|proficiency in|proficient in|familiarity with|knowledge of|expertise in|background in|working on|working with|using|such as)\s+([^.;:]+)/gi
    )
  ];

  return unique(
    matches.flatMap((match) =>
      (match[1] ?? "")
        .split(/,|;|\/|\bor\b|\band\b/gi)
        .map((part) =>
          cleanPhrase(
            part
              .replace(/^\s*(?:along with\s+)?experience(?:\s+working)?\s+(?:with|on)\s+/i, "")
              .replace(/^\s*(?:along with\s+)?familiarity with\s+/i, "")
              .replace(/^\s*(?:along with\s+)?knowledge of\s+/i, "")
              .replace(/^\s*(?:along with\s+)?proficiency in\s+/i, "")
              .replace(/^\s*(?:along with\s+)?proficient in\s+/i, "")
              .replace(/^\s*(?:along with\s+)?background in\s+/i, "")
              .replace(/^\s*(?:along with\s+)?expertise in\s+/i, "")
              .replace(
                /^(?:multiple programming languages|programming languages|frameworks|platforms|systems|tools|technologies|methodologies)\s+such as\s+/i,
                ""
              )
              .replace(
                /^(?:multiple programming languages|programming languages|frameworks|platforms|systems|tools|technologies|methodologies)\s+/i,
                ""
              )
              .replace(/\bis essential\b.*$/i, "")
              .replace(/\bis expected\b.*$/i, "")
              .replace(/\bis required\b.*$/i, "")
              .replace(/\bsimilar\b.*$/i, "")
              .replace(/\b(?:or similar|preferred|required|expected|essential)\b.*$/i, "")
          )
        )
        .filter(Boolean)
    )
  ).slice(0, 10);
}

function extractAlternativeRequirementGroups(
  lines: string[],
  skillDictionary: SkillDictionary
) {
  const groups = [];

  for (const line of lines) {
    const match = line.match(
      /\b(?:one or more of the following|one or more of|one of the following|any of the following)\s*:?\s*(.+)$/i
    );

    if (!match?.[1]) {
      continue;
    }

    const items = unique(
      extractCommaSeparatedPhrases(match[1])
        .map((phrase) => canonicalizeOrFormatSkill(phrase, skillDictionary))
        .filter((phrase) => likelySkillPhrase(phrase))
    );

    if (items.length < 2) {
      continue;
    }

    groups.push({
      items,
      mode: "any_of" as const,
      source_section: "required_skills"
    });
  }

  return groups;
}

function likelySkillPhrase(value: string) {
  const normalizedValue = normalize(value);
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

  if (!normalizedValue || normalizedValue.length < 2) {
    return false;
  }

  if (genericRequirementPhrases.has(normalizedValue)) {
    return false;
  }

  if (
    /\byears?\b|\bexperience\b|\bbuilding\b|\bplatforms?\b|\bapplications?\b/.test(
      normalizedValue
    )
  ) {
    return false;
  }

  if (wordCount > 3) {
    return false;
  }

  if (/[+#./]/.test(value)) {
    return true;
  }

  if (/^[A-Z0-9]{2,}$/.test(value)) {
    return true;
  }

  if (/^[A-Z][A-Za-z0-9-]+(?:\s+[A-Z][A-Za-z0-9-]+){0,2}$/.test(value)) {
    return true;
  }

  return /^[a-z][a-z0-9+#./-]{2,}(?:\s+[a-z][a-z0-9+#./-]{2,}){0,2}$/.test(value);
}

function isCandidateContentLine(line: string) {
  return (
    /^[-*•]/.test(line) ||
    /\b(required|preferred|experience|design|build|develop|lead|maintain|support|collaborate|mentor|own|proficient|qualifications|responsibilities|skills|knowledge|familiarity|expertise)\b/i.test(
      line
    )
  );
}

function ignoredSectionHeading(line: string) {
  return /^(about (?:the )?(?:company|role)|company overview|benefits|compensation|equal opportunity|eeo|about us|why join us|who we are|our culture|what we offer)[:\s-]*$/i.test(
    line
  );
}

function cleanBullet(line: string) {
  return line.replace(/^[-*•]\s*/, "").trim();
}

function cleanPhrase(value: string) {
  return value
    .replace(/^[^A-Za-z0-9]+/, "")
    .replace(/[^A-Za-z0-9+#./ -]+$/g, "")
    .trim();
}

function formatSkillPhrase(value: string) {
  if (/^[A-Z0-9.+/# -]+$/.test(value)) {
    return value;
  }

  return value
    .split(/\s+/)
    .map((part) =>
      /^[a-z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part
    )
    .join(" ");
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function sameSkill(a: string, b: string) {
  return normalize(a) === normalize(b);
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

const genericRequirementPhrases = new Set([
  "experience",
  "strong communication",
  "team player",
  "problem solving",
  "collaboration",
  "leadership",
  "bachelor s degree",
  "degree",
  "computer science"
]);

const phraseAliases = new Map([
  ["content management system", "CMS"],
  ["content management systems", "CMS"],
  ["api integration", "API"],
  ["api integrations", "API"],
  ["application programming interface", "API"],
  ["application programming interfaces", "API"]
]);
