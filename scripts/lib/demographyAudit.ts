/**
 * Measures the defects that make the corpus's demographic figures unrankable.
 *
 * 774 of 776 people fiches carry a population and a per-country split, which is
 * rare material, but three things stop it being ranked as it stands: language
 * families are filed as peoples, the same people exists several times over with
 * different figures, and the figures are projections whose nature is stated only
 * in prose. `docs/editorial/demography-cleanup/README.md` is the arbitration
 * note this feeds; the rulings live there, not here.
 *
 * Nothing in this module decides anything. It reports candidates, because every
 * one of the three defects resolves into an editorial judgement — which fiche of
 * a cluster is the principal, whether Akan is a people or a cluster of peoples —
 * and that judgement is not a program's to make.
 */

export interface PeopleFiche {
  id: string;
  nameMain: string;
  languageFamilyId: string;
  classificationStatus?: string;
  content: {
    ethnicities?: string[];
    appellations?: { selfAppellation?: string | null };
    demography?: {
      totalPopulation?: number | null;
      referenceYear?: number | null;
      source?: string | null;
      distributionByCountry?: { country?: string; population?: number }[];
    };
    sources?: { tier?: string }[];
    [key: string]: unknown;
  };
}

export interface CountryFiche {
  id: string;
  content: {
    demographics?: {
      totalPopulation?: number | null;
      peoples?: {
        peopleId?: string;
        name?: string;
        percentageInCountry?: number;
      }[];
    };
  };
}

export interface MacroGroup {
  id: string;
  name: string;
  totalPopulation: number | null;
  languageFamilyId: string;
  countries: number;
}

export interface ContainerFiche {
  id: string;
  name: string;
  totalPopulation: number | null;
  alsoFlaggedAsMacroGroup: boolean;
  contains: string[];
}

export interface ClusterMember {
  id: string;
  name: string;
  totalPopulation: number | null;
  languageFamilyId: string;
  countries: string[];
  contentChars: number;
  sources: number;
  officialSources: number;
  selfAppellation: string | null;
}

export interface DuplicateCluster {
  stem: string;
  proposedPrincipal: string;
  richestText: string;
  /** True when adopting the principal would bury the cluster's fullest prose. */
  textConflict: boolean;
  members: ClusterMember[];
}

export interface CountryOvercount {
  country: string;
  countryPopulation: number;
  sumRaw: number;
  ratioRaw: number;
  sumAfterCuration: number;
  ratioAfterCuration: number;
  usableAfterCuration: boolean;
}

export type FigureSignal = "census" | "aggregated-estimate" | "projection";

export interface FigureStatus {
  id: string;
  totalPopulation: number | null;
  signals: FigureSignal[];
  /** The source counts speakers of a language, not members of a people. */
  speakerCountOnly: boolean;
  citesJoshuaProject: boolean;
  citesWikipedia: boolean;
  derivable: boolean;
}

export interface CrossCheckEntry {
  country: string;
  peopleId?: string;
  name?: string;
  percentageInCountry: number;
  impliedFromCountryFiche: number;
  peopleFicheSays?: number;
  ratio?: number;
  status:
    | "consistent"
    | "divergent"
    | "no-peopleId"
    | "unknown-peopleId"
    | "absent-from-distributionByCountry";
}

export interface ImpossibleEntry {
  id: string;
  country: string;
  population: number;
  reason: "exceeds-own-total" | "exceeds-country-population";
  ceiling: number;
}

export interface DemographyReport {
  fiches: number;
  withFigure: number;
  macroGroups: MacroGroup[];
  containerFiches: ContainerFiche[];
  duplicateClusters: DuplicateCluster[];
  countryOvercount: CountryOvercount[];
  figureStatus: FigureStatus[];
  crossCheck: CrossCheckEntry[];
  impossibleEntries: ImpossibleEntry[];
}

/** A country whose peoples sum past this much of its own population is unrankable. */
const OVERCOUNT_TOLERANCE = 1.15;
/** Below half or above one and a half, the two declarations are not the same claim. */
const DIVERGENCE_LOW = 0.67;
const DIVERGENCE_HIGH = 1.5;

const CENSUS =
  /recensement|census|institut national|statistics south africa|enquete demographique|rgph/;
const PROJECTION =
  /projection|projete|projetee|extrapolation|croissance demographique/;
const AGGREGATE =
  /estimation agregee|estimations agregees|agregation|fourchette|entre .{1,12} et /;
const HEADCOUNT = /recensement|census|population totale|habitants|effectif/;

/**
 * `PPL_BANTU` is the one macro-group no wording rule catches: it is named like a
 * people and only its id betrays that its stem is a linguistic family.
 */
const MACRO_BY_ID = new Set(["PPL_BANTU"]);

/**
 * Scope words a fiche name carries when it re-states an existing people rather
 * than naming a new one. Stripping them is what makes "Lomwe (Malawi)" and
 * "Lomwe" collide, and leaving a genuine people's name intact is why the list is
 * enumerated rather than "anything in parentheses".
 */
const SCOPE_QUALIFIER = new RegExp(
  "\\b(" +
    [
      "national",
      "nationaux",
      "nord",
      "sud",
      "est",
      "ouest",
      "centre",
      "macro",
      "macro groupe",
      "groupe",
      "sahel",
      "foret",
      "nomades",
      "lac",
      "locuteurs",
      "zimbabwe",
      "mozambique",
      "malawi",
      "zambie",
      "zambia",
      "afrique du sud",
      "kwazulu",
      "ciskei",
      "kasai",
      "katanga",
      "burundi",
      "rwanda",
      "congo",
      "kenya",
      "tanzanie",
      "ouganda",
      "nigeria",
      "cameroun",
      "tchad",
      "niger",
      "mali",
      "senegal",
      "guinee",
      "ghana",
      "benin",
      "togo",
      "angola",
      "somalie",
      "ethiopie",
      "soudan",
      "yemen",
      "oman",
      "barundi",
      "matabele",
      "ndzundza",
      "manala",
      "massina",
      "calanga",
      "bangala",
    ].join("|") +
    ")\\b",
  "g"
);

/**
 * Synonym pairs no stem rule can bridge, because the two names share no letters
 * in common. Each was confirmed by reading both fiches.
 */
const SYNONYM_BRIDGES: [string, string][] = [
  ["fula", "fulbe"],
  ["kongo", "kikongo"],
];

function deaccent(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase();
}

function alphanumeric(value: unknown): string {
  return deaccent(value).replace(/[^a-z0-9]+/g, "");
}

/** Total prose in a fiche — the proxy for how much editorial work it holds. */
function proseLength(value: unknown): number {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value))
    return value.reduce<number>((n, v) => n + proseLength(v), 0);
  if (value && typeof value === "object") {
    return Object.values(value).reduce<number>((n, v) => n + proseLength(v), 0);
  }
  return 0;
}

function nameStem(fiche: PeopleFiche): string {
  const stem = deaccent(fiche.nameMain)
    .replace(/\(.*?\)/g, " ")
    .split(/[/,;]/)[0]
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(SCOPE_QUALIFIER, " ")
    .replace(/\b(du|de|des|la|le|les|d|l|au|aux|et)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // Bantu noun-class prefix: Bakongo and Kongo are one name, amaXhosa and Xhosa too.
    .replace(/^(ba|ama|wa|aba|va|ova|bat)(?=\w{4,})/, "")
    .replace(/s$/, "");
  return stem || deaccent(fiche.id);
}

function isMacroGroup(fiche: PeopleFiche): boolean {
  const name = String(fiche.nameMain ?? "");
  return (
    fiche.id.includes("_MACRO") ||
    MACRO_BY_ID.has(fiche.id) ||
    /macro-group/i.test(name) ||
    deaccent(name).startsWith("peuples ") ||
    /\(locuteurs\)/i.test(name)
  );
}

function distribution(fiche: PeopleFiche): Map<string, number> {
  const entries = fiche.content.demography?.distributionByCountry ?? [];
  const byCountry = new Map<string, number>();
  for (const entry of entries) {
    if (entry.country) byCountry.set(entry.country, entry.population ?? 0);
  }
  return byCountry;
}

function findMacroGroups(peoples: PeopleFiche[]): MacroGroup[] {
  return peoples
    .filter(isMacroGroup)
    .map((fiche) => ({
      id: fiche.id,
      name: fiche.nameMain,
      totalPopulation: fiche.content.demography?.totalPopulation ?? null,
      languageFamilyId: fiche.languageFamilyId,
      countries: distribution(fiche).size,
    }))
    .sort((a, b) => (b.totalPopulation ?? 0) - (a.totalPopulation ?? 0));
}

/**
 * A fiche that names two or more other fiches in its own `ethnicities` list is
 * telling the corpus it contains them. This is not a guess about wording — it is
 * the nesting the editorial work already recorded, in a field it already fills.
 *
 * The relation carries no direction, so a child that names its parent is
 * reported too. That is why the output is a candidate list for review.
 */
function findContainerFiches(
  peoples: PeopleFiche[],
  macroIds: Set<string>
): ContainerFiche[] {
  const idsByName = new Map<string, string[]>();
  for (const fiche of peoples) {
    const key = alphanumeric(
      String(fiche.nameMain ?? "").replace(/\(.*?\)/g, "")
    );
    if (key.length <= 3) continue;
    idsByName.set(key, [...(idsByName.get(key) ?? []), fiche.id]);
  }

  const containers: ContainerFiche[] = [];
  for (const fiche of peoples) {
    const named = new Set<string>();
    for (const ethnicity of fiche.content.ethnicities ?? []) {
      for (const token of String(ethnicity).split(/[/,;()]/)) {
        for (const id of idsByName.get(alphanumeric(token)) ?? []) {
          if (id !== fiche.id) named.add(id);
        }
      }
    }
    if (named.size >= 2) {
      containers.push({
        id: fiche.id,
        name: fiche.nameMain,
        totalPopulation: fiche.content.demography?.totalPopulation ?? null,
        alsoFlaggedAsMacroGroup: macroIds.has(fiche.id),
        contains: [...named].sort(),
      });
    }
  }
  return containers.sort(
    (a, b) => (b.totalPopulation ?? 0) - (a.totalPopulation ?? 0)
  );
}

function findDuplicateClusters(peoples: PeopleFiche[]): DuplicateCluster[] {
  const byStem = new Map<string, PeopleFiche[]>();
  for (const fiche of peoples) {
    const stem = nameStem(fiche);
    byStem.set(stem, [...(byStem.get(stem) ?? []), fiche]);
  }
  for (const [keep, merge] of SYNONYM_BRIDGES) {
    const merged = byStem.get(merge);
    if (byStem.has(keep) && merged) {
      byStem.set(keep, [...(byStem.get(keep) ?? []), ...merged]);
      byStem.delete(merge);
    }
  }

  const clusters: DuplicateCluster[] = [];
  for (const [stem, members] of byStem) {
    if (members.length < 2) continue;
    const scored: (ClusterMember & { fiche: PeopleFiche })[] = members.map(
      (fiche) => ({
        fiche,
        id: fiche.id,
        name: fiche.nameMain,
        totalPopulation: fiche.content.demography?.totalPopulation ?? null,
        languageFamilyId: fiche.languageFamilyId,
        countries: [...distribution(fiche).keys()].sort(),
        contentChars: proseLength(fiche.content),
        sources: (fiche.content.sources ?? []).length,
        officialSources: (fiche.content.sources ?? []).filter(
          (source) => source.tier === "official"
        ).length,
        selfAppellation: fiche.content.appellations?.selfAppellation ?? null,
      })
    );

    // Widest scope, not biggest figure: the pan-ethnic fiche is the one a
    // country-scoped fiche should attach to, and its number is often the weakest.
    const principal = [...scored].sort(
      (a, b) =>
        b.countries.length - a.countries.length ||
        b.contentChars - a.contentChars
    )[0];
    const richest = [...scored].sort(
      (a, b) =>
        b.contentChars - a.contentChars || b.officialSources - a.officialSources
    )[0];

    clusters.push({
      stem,
      proposedPrincipal: principal.id,
      richestText: richest.id,
      textConflict: principal.id !== richest.id,
      members: scored
        .map(({ fiche: _fiche, ...member }) => member)
        .sort((a, b) => (b.totalPopulation ?? 0) - (a.totalPopulation ?? 0)),
    });
  }
  return clusters.sort(
    (a, b) =>
      Math.max(...b.members.map((m) => m.totalPopulation ?? 0)) -
      Math.max(...a.members.map((m) => m.totalPopulation ?? 0))
  );
}

function measureOvercount(
  peoples: PeopleFiche[],
  countries: CountryFiche[],
  excluded: Set<string>
): CountryOvercount[] {
  const sum = (skip: Set<string>) => {
    const totals = new Map<string, number>();
    for (const fiche of peoples) {
      if (skip.has(fiche.id)) continue;
      for (const [country, population] of distribution(fiche)) {
        totals.set(country, (totals.get(country) ?? 0) + population);
      }
    }
    return totals;
  };
  const raw = sum(new Set());
  const cured = sum(excluded);

  return countries
    .filter((country) => country.content.demographics?.totalPopulation)
    .map((country) => {
      const population = country.content.demographics!.totalPopulation!;
      const sumRaw = raw.get(country.id) ?? 0;
      const sumAfterCuration = cured.get(country.id) ?? 0;
      const ratioAfterCuration = sumAfterCuration / population;
      return {
        country: country.id,
        countryPopulation: population,
        sumRaw,
        ratioRaw: sumRaw / population,
        sumAfterCuration,
        ratioAfterCuration,
        usableAfterCuration: ratioAfterCuration <= OVERCOUNT_TOLERANCE,
      };
    })
    .sort((a, b) => b.ratioAfterCuration - a.ratioAfterCuration);
}

function deriveFigureStatus(peoples: PeopleFiche[]): FigureStatus[] {
  return peoples.map((fiche) => {
    const source = deaccent(fiche.content.demography?.source);
    const signals: FigureSignal[] = [];
    if (CENSUS.test(source)) signals.push("census");
    if (AGGREGATE.test(source)) signals.push("aggregated-estimate");
    if (PROJECTION.test(source)) signals.push("projection");
    return {
      id: fiche.id,
      totalPopulation: fiche.content.demography?.totalPopulation ?? null,
      signals,
      speakerCountOnly:
        /locuteur|speakers/.test(source) && !HEADCOUNT.test(source),
      citesJoshuaProject: source.includes("joshua project"),
      citesWikipedia: source.includes("wikipedia"),
      derivable: signals.length === 1,
    };
  });
}

/**
 * The corpus states each of these figures twice: as a percentage on the country
 * fiche and as an absolute on the people fiche. Nothing checks that the two
 * agree, which makes the disagreement itself the cheapest outlier detector
 * available — it needs no source the corpus does not already hold.
 */
function crossCheckDeclarations(
  peoples: PeopleFiche[],
  countries: CountryFiche[]
): CrossCheckEntry[] {
  const byId = new Map(peoples.map((fiche) => [fiche.id, fiche]));

  const entries: CrossCheckEntry[] = [];
  for (const country of countries) {
    const population = country.content.demographics?.totalPopulation;
    if (!population) continue;
    for (const declared of country.content.demographics?.peoples ?? []) {
      const percentage = declared.percentageInCountry;
      if (percentage === undefined || percentage === null) continue;
      const implied = Math.round((percentage / 100) * population);
      const base = {
        country: country.id,
        peopleId: declared.peopleId,
        name: declared.name,
        percentageInCountry: percentage,
        impliedFromCountryFiche: implied,
      };

      const fiche = declared.peopleId ? byId.get(declared.peopleId) : undefined;
      if (!declared.peopleId) {
        entries.push({ ...base, status: "no-peopleId" });
        continue;
      }
      if (!fiche) {
        entries.push({ ...base, status: "unknown-peopleId" });
        continue;
      }
      const stated = distribution(fiche).get(country.id);
      if (stated === undefined) {
        entries.push({ ...base, status: "absent-from-distributionByCountry" });
        continue;
      }
      const ratio = implied ? stated / implied : undefined;
      entries.push({
        ...base,
        peopleFicheSays: stated,
        ratio,
        status:
          ratio === undefined ||
          ratio > DIVERGENCE_HIGH ||
          ratio < DIVERGENCE_LOW
            ? "divergent"
            : "consistent",
      });
    }
  }
  return entries.sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));
}

/** Entries that need no editorial judgement, because arithmetic already rejects them. */
function findImpossibleEntries(
  peoples: PeopleFiche[],
  countries: CountryFiche[]
): ImpossibleEntry[] {
  const countryPopulation = new Map(
    countries
      .filter((country) => country.content.demographics?.totalPopulation)
      .map((country) => [
        country.id,
        country.content.demographics!.totalPopulation!,
      ])
  );

  const impossible: ImpossibleEntry[] = [];
  for (const fiche of peoples) {
    const total = fiche.content.demography?.totalPopulation ?? null;
    for (const [country, population] of distribution(fiche)) {
      if (total !== null && population > total) {
        impossible.push({
          id: fiche.id,
          country,
          population,
          reason: "exceeds-own-total",
          ceiling: total,
        });
        continue;
      }
      const ceiling = countryPopulation.get(country);
      if (ceiling !== undefined && population > ceiling) {
        impossible.push({
          id: fiche.id,
          country,
          population,
          reason: "exceeds-country-population",
          ceiling,
        });
      }
    }
  }
  return impossible;
}

export function auditDemography(
  peoples: PeopleFiche[],
  countries: CountryFiche[]
): DemographyReport {
  const macroGroups = findMacroGroups(peoples);
  const macroIds = new Set(macroGroups.map((group) => group.id));
  const duplicateClusters = findDuplicateClusters(peoples);

  const attached = new Set<string>();
  for (const cluster of duplicateClusters) {
    for (const member of cluster.members) {
      if (member.id !== cluster.proposedPrincipal) attached.add(member.id);
    }
  }

  return {
    fiches: peoples.length,
    withFigure: peoples.filter(
      (fiche) => (fiche.content.demography?.totalPopulation ?? 0) > 0
    ).length,
    macroGroups,
    containerFiches: findContainerFiches(peoples, macroIds),
    duplicateClusters,
    countryOvercount: measureOvercount(
      peoples,
      countries,
      new Set([...macroIds, ...attached])
    ),
    figureStatus: deriveFigureStatus(peoples),
    crossCheck: crossCheckDeclarations(peoples, countries),
    impossibleEntries: findImpossibleEntries(peoples, countries),
  };
}
