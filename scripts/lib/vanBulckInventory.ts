export interface VanBulckInventoryEntry {
  sourceId: string;
  printedPage: number;
  rawLabel: string;
  simplifiedLabel: string;
}

interface ExtractOptions {
  firstPrintedPage: number;
}

export interface LocalPeopleIdentity {
  id: string;
  nameMain?: string;
  appellations?: {
    mainName?: string;
    selfAppellation?: string;
    exonyms?: string[];
    spellingAliases?: string[];
  };
}

const NON_ENTRY_PATTERNS = [
  /^liste\b/i,
  /^noms?\b/i,
  /^ethniques?\.?$/i,
  /^linguistiques?\.?$/i,
  /^au congo\b/i,
  /^orthographie\b/i,
  /^on y trouve\b/i,
  /^ceux qui\b/i,
  /^se servir\b/i,
  /^l.element\b/i,
  /^radical\b/i,
  /^\d+\b/,
];

function cleanWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function simplifyVanBulckEthnonym(rawLabel: string): string {
  const cleaned = cleanWhitespace(rawLabel)
    .replace(/\s*<[^>]+>/g, "")
    .replace(/\s*\/.*$/, "")
    .trim();
  const radicalStart = cleaned.search(/[A-ZÀ-ÖØ-Ý]/);
  if (radicalStart < 0) return cleaned;
  return cleanWhitespace(cleaned.slice(radicalStart));
}

function isInventoryCell(value: string): boolean {
  const cleaned = cleanWhitespace(value);
  if (!cleaned || cleaned.length > 48) return false;
  if (NON_ENTRY_PATTERNS.some((pattern) => pattern.test(cleaned))) return false;

  const simplified = simplifyVanBulckEthnonym(cleaned);
  if (simplified.length < 2 || /^[A-Z]$/.test(simplified)) return false;
  return /[A-ZÀ-ÖØ-Ý]/.test(cleaned);
}

export function extractVanBulckListFour(
  text: string,
  { firstPrintedPage }: ExtractOptions
): VanBulckInventoryEntry[] {
  const entries: VanBulckInventoryEntry[] = [];
  let insideListFour = false;

  for (const [pageIndex, page] of text.split("\f").entries()) {
    const printedPage = firstPrintedPage + pageIndex;
    let sequence = 0;

    for (const line of page.split(/\r?\n/)) {
      if (/\bLISTE\s+IV\b/i.test(line)) {
        insideListFour = true;
        continue;
      }
      if (/\bLISTE\s+V\b/i.test(line)) return entries;
      if (!insideListFour) continue;

      const cells = line
        .trim()
        .split(/\s{2,}/)
        .map(cleanWhitespace)
        .filter(isInventoryCell);

      for (const rawLabel of cells) {
        sequence += 1;
        entries.push({
          sourceId: `VB1954-P${printedPage}-${String(sequence).padStart(3, "0")}`,
          printedPage,
          rawLabel,
          simplifiedLabel: simplifyVanBulckEthnonym(rawLabel),
        });
      }
    }
  }

  return entries;
}

function normalizeIdentity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function identityVariants(value: string | undefined): string[] {
  if (!value) return [];
  return [value, ...value.split(/\s*(?:\/|;|,|\bou\b)\s*/i)]
    .map(normalizeIdentity)
    .filter(Boolean);
}

function peopleIdentityKeys(people: LocalPeopleIdentity): Set<string> {
  const appellations = people.appellations ?? {};
  return new Set(
    [
      people.nameMain,
      appellations.mainName,
      appellations.selfAppellation,
      ...(appellations.exonyms ?? []),
      ...(appellations.spellingAliases ?? []),
    ].flatMap(identityVariants)
  );
}

export function matchHistoricalInventoryToPeoples(
  sourceEntries: VanBulckInventoryEntry[],
  peoples: LocalPeopleIdentity[]
) {
  const identityKeysByPeople = new Map(
    peoples.map((people) => [people.id, peopleIdentityKeys(people)])
  );
  const entries = sourceEntries.map((entry) => {
    const sourceKey = normalizeIdentity(entry.simplifiedLabel);
    const exactMatchIds = [...identityKeysByPeople.entries()]
      .filter(([, keys]) => keys.has(sourceKey))
      .map(([peopleId]) => peopleId)
      .sort();
    const matchStatus =
      exactMatchIds.length === 0
        ? "unmatched"
        : exactMatchIds.length === 1
          ? "unique"
          : "ambiguous";

    return { ...entry, matchStatus, exactMatchIds };
  });
  const matchedLocalPeople = new Set(
    entries.flatMap((entry) => entry.exactMatchIds)
  );

  return {
    summary: {
      sourceEntries: entries.length,
      uniqueSourceLabels: new Set(
        entries.map((entry) => normalizeIdentity(entry.simplifiedLabel))
      ).size,
      uniquelyMatchedEntries: entries.filter(
        (entry) => entry.matchStatus === "unique"
      ).length,
      ambiguouslyMatchedEntries: entries.filter(
        (entry) => entry.matchStatus === "ambiguous"
      ).length,
      unmatchedEntries: entries.filter(
        (entry) => entry.matchStatus === "unmatched"
      ).length,
      matchedLocalPeople: matchedLocalPeople.size,
    },
    matchedLocalPeopleIds: [...matchedLocalPeople].sort(),
    entries,
  };
}
