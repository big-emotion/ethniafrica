/**
 * Fiche vivante — the invariants that must hold identically on all three
 * fiche routes (Epic 15 · Story 15.9 · ETNI-931).
 *
 * peuples, pays and familles now delegate their whole body to one renderer.
 * Each route's own suite asserts what that route shows; this file asserts what
 * the three must share, driven through the real route components so the
 * property is stated once instead of drifting into three hand-maintained
 * copies. Every assertion below is parameterised over the three entity types
 * for that reason — a rule that holds for only one of them does not belong
 * here, it belongs in that route's suite.
 *
 * SEO is deliberately absent: fiche-seo-baseline.test.ts already freezes the
 * crawler-facing surface of the same three routes, and a gate with two owners
 * is a gate nobody maintains.
 */

import { render, screen, waitFor } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NIGER_CONGO,
  NIGER_CONGO_BRANCHES,
  NIGERIA,
  RELATIONS,
  YORUBA,
  YORUBA_DISTRIBUTIONS,
  YORUBA_FRAGMENTATION,
  YORUBA_NAMES_DOSSIER,
} from "@/components/fiche/__tests__/ficheContextFixtures";
import type { FamilyTreeSkeleton } from "@/api/v2/services/languageFamilyTreeService";
import type { LanguageFamily } from "@/types/afrik";

// ---------------------------------------------------------------------------
// Boundaries — Supabase-backed services, the legacy detail views, page chrome.
// The composer, the registry and the panels stay real: they are the subject.
// ---------------------------------------------------------------------------

const {
  getPeopleById,
  getPeoplesByLanguageFamily,
  getCountryById,
  getLanguageFamilyById,
  getFamilyTreeSkeleton,
  getPeopleNamesDossier,
  getPeopleFragmentation,
  getEgoNetwork,
  listPublicOralNarratives,
  getActiveSourceFlags,
  getPeopleRevisionSnapshot,
  getRevisionSnapshot,
  getLatestEntityRevisionVersion,
} = vi.hoisted(() => ({
  getPeopleById: vi.fn(),
  getPeoplesByLanguageFamily: vi.fn(),
  getCountryById: vi.fn(),
  getLanguageFamilyById: vi.fn(),
  getFamilyTreeSkeleton: vi.fn(),
  getPeopleNamesDossier: vi.fn(),
  getPeopleFragmentation: vi.fn(),
  getEgoNetwork: vi.fn(),
  listPublicOralNarratives: vi.fn(),
  getActiveSourceFlags: vi.fn(),
  getPeopleRevisionSnapshot: vi.fn(),
  getRevisionSnapshot: vi.fn(),
  getLatestEntityRevisionVersion: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/api/v2/services/peopleService", () => ({
  getPeopleById: (...args: unknown[]) => getPeopleById(...args),
  getPeoplesByLanguageFamily: (...args: unknown[]) =>
    getPeoplesByLanguageFamily(...args),
}));

vi.mock("@/api/v2/services/countryService", () => ({
  getCountryById: (...args: unknown[]) => getCountryById(...args),
  getCountryIndex: async () => [
    { id: "NGA", nameFr: "Nigeria" },
    { id: "KEN", nameFr: "Kenya" },
  ],
}));

vi.mock("@/api/v2/services/languageFamilyService", () => ({
  getLanguageFamilyById: (...args: unknown[]) => getLanguageFamilyById(...args),
}));

vi.mock("@/api/v2/services/languageFamilyTreeService", () => ({
  getFamilyTreeSkeleton: (...args: unknown[]) => getFamilyTreeSkeleton(...args),
}));

vi.mock("@/api/v2/services/names", () => ({
  getPeopleNamesDossier: (...args: unknown[]) => getPeopleNamesDossier(...args),
}));

vi.mock("@/api/v2/services/peopleFragmentation", () => ({
  getPeopleFragmentation: (...args: unknown[]) =>
    getPeopleFragmentation(...args),
}));

vi.mock("@/api/v2/services/relations", () => ({
  getEgoNetwork: (...args: unknown[]) => getEgoNetwork(...args),
}));

vi.mock("@/api/v2/services/oralNarratives", () => ({
  listPublicOralNarratives: (...args: unknown[]) =>
    listPublicOralNarratives(...args),
}));

vi.mock("@/lib/supabase/queries/afrik/flags", () => ({
  getActiveSourceFlags: (...args: unknown[]) => getActiveSourceFlags(...args),
}));

vi.mock("@/api/v2/services/revisions", () => ({
  getPeopleRevisionSnapshot: (...args: unknown[]) =>
    getPeopleRevisionSnapshot(...args),
  getRevisionSnapshot: (...args: unknown[]) => getRevisionSnapshot(...args),
  getLatestEntityRevisionVersion: (...args: unknown[]) =>
    getLatestEntityRevisionVersion(...args),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

// The three legacy detail views are stubbed down to a marker each: the reading
// gate is counted below, and a <details> buried inside a real detail view would
// make that count say nothing about the route's own wiring.
vi.mock("@/components/people/PeopleDetailViewV2", () => ({
  // Carries text: a chapter's emptiness is asserted on its text content, and
  // the real parchment is the wordiest thing on the page.
  PeopleDetailViewV2: () => (
    <div data-testid="people-record-view">Dossier AFRIK du peuple</div>
  ),
}));

vi.mock("@/components/country/CountryRecordView", () => ({
  // Carries text on purpose: the country dossier is the page body now, so an
  // empty stub would trip the "no anchor scrolls to an empty chapter" guard on
  // the very section that guard exists to protect.
  CountryRecordView: () => (
    <div data-testid="country-record-view">Dossier AFRIK du pays</div>
  ),
}));

vi.mock("@/components/family/LanguageFamilyDetailViewV2", () => ({
  LanguageFamilyDetailViewV2: () => <div data-testid="family-record-view" />,
}));

vi.mock("@/components/family/FamilyClassificationTreeSection", () => ({
  FamilyClassificationTreeSection: () => <div data-testid="family-tree" />,
}));

// ---------------------------------------------------------------------------
// Subjects under test — imported after the boundaries are in place
// ---------------------------------------------------------------------------

import PeuplesSlugPage from "../peuples/[slug]/page";
import PaysSlugPage from "../pays/[slug]/page";
import FamillesSlugPage from "../familles/[slug]/page";

import { ACCENT_CLASS_BY_ENTITY } from "@/components/fiche/FicheSequence";
import { sectionIdForPanel } from "@/components/fiche/panelRegistry";
import {
  derivePanelSequence,
  PANEL_TABLE,
  type FicheEntityType,
  type PanelKind,
} from "@/lib/fichePanels";
import {
  mapCountryDetail,
  mapLanguageFamilyDetail,
  mapPeopleDetail,
} from "@/lib/afrikDetailMapper";

// ---------------------------------------------------------------------------
// Corpus — the stored rows the three routes read, built from the fixtures the
// panel suites already share, so one corpus backs the unit and route views.
// ---------------------------------------------------------------------------

const YORUBA_ROW = {
  id: YORUBA.id,
  nameMain: YORUBA.nameMain,
  languageFamilyId: YORUBA.languageFamilyId,
  currentCountries: YORUBA.currentCountries,
  content: {
    ethnicities: YORUBA.ethnicities,
    origins: YORUBA.origins,
    languages: YORUBA.languages,
    historicalRole: YORUBA.historicalRole,
    culture: YORUBA.culture,
    demography: {
      ...YORUBA.demography,
      // The territory chapter reads the per-country split off stored
      // demography; the shared fixture carries it already transformed.
      distributionByCountry: YORUBA_DISTRIBUTIONS.map(
        ({ country, percentage }) => ({ country, percentage })
      ),
    },
  },
};

const NIGERIA_ROW = {
  id: NIGERIA.id,
  nameFr: NIGERIA.nameFr,
  content: {
    historicalNames: NIGERIA.historicalNames,
    majorPeoples: NIGERIA.majorPeoples,
    historicalFacts: NIGERIA.historicalFacts,
    culture: NIGERIA.culture,
    demographics: NIGERIA.demographics,
    sources: NIGERIA.sources,
  },
};

const NIGER_CONGO_ROW: LanguageFamily = {
  id: NIGER_CONGO.id,
  nameFr: NIGER_CONGO.nameFr,
  associatedPeoples: NIGER_CONGO.associatedPeoples,
  content: {
    generalInfo: NIGER_CONGO.generalInfo,
    linguisticCharacteristics: NIGER_CONGO.linguisticCharacteristics,
    historyAndOrigins: NIGER_CONGO.historyAndOrigins,
    sources: NIGER_CONGO.sources,
  },
};

const NIGER_CONGO_TREE: FamilyTreeSkeleton = {
  family: { id: NIGER_CONGO.id, nameFr: NIGER_CONGO.nameFr },
  branches: NIGER_CONGO_BRANCHES.map(({ id, name, peopleCount }) => ({
    iso639_3: id,
    name,
    peopleCount,
  })),
  unlinkedPeopleCount: 0,
};

/**
 * The name only the frozen revision carries. Asserting it appears on a pinned
 * URL — while the live name does not — is what makes DEC-004 observable from
 * outside: the page shows what was stored, not what the corpus says today.
 */
const FROZEN_REVISION_NAME = "Nom figé de la révision";
const PINNED_VERSION = 7;

// ---------------------------------------------------------------------------
// Route table
// ---------------------------------------------------------------------------

type FicheRoutePage = (props: {
  params: Promise<{ lang: string; slug: string }>;
}) => Promise<ReactNode>;

interface FicheRouteUnderTest {
  segment: string;
  entityType: FicheEntityType;
  slug: string;
  page: FicheRoutePage;
  /** The name the live corpus carries — must never surface on a pinned URL. */
  liveName: string;
  recordTestId: string;
  /** Feeds the route's services the live corpus for `slug`. */
  primeLiveCorpus: () => void;
  /** Feeds the route's revision service a frozen snapshot for `slug@vN`. */
  primeFrozenRevision: () => void;
  /** The chapter sequence the composer derives from that same live corpus. */
  composedSequence: () => PanelKind[];
  /**
   * Whether any chapter this route renders prints the dossier citation. Only
   * the panels taking `AFRIK_DOSSIER_CITATION` do; ScalePanel prints its own
   * corpus source as plain text, so a fiche reduced to scale prints none.
   */
  printsDossierCitation: boolean;
  /**
   * Whether the dossier is a gated chapter (FR97) or the page's own body.
   * A fiche whose parchment *is* the page opens it unfolded; asking the reader
   * to disclose what they came for is what the Atlas mockup removes.
   */
  gatesRecord: boolean;
}

const FICHE_ROUTES: FicheRouteUnderTest[] = [
  {
    segment: "peuples",
    entityType: "people",
    slug: YORUBA.id,
    page: PeuplesSlugPage,
    liveName: YORUBA.nameMain,
    recordTestId: "people-record-view",
    primeLiveCorpus: () => {
      getPeopleById.mockResolvedValue(YORUBA_ROW);
      getPeopleNamesDossier.mockResolvedValue(YORUBA_NAMES_DOSSIER);
      getPeopleFragmentation.mockResolvedValue(YORUBA_FRAGMENTATION);
      getEgoNetwork.mockResolvedValue({ sourced: RELATIONS, derived: [] });
      listPublicOralNarratives.mockResolvedValue({
        data: PUBLISHED_NARRATIVES,
        total: PUBLISHED_NARRATIVES.length,
      });
      getActiveSourceFlags.mockResolvedValue([]);
    },
    primeFrozenRevision: () => {
      getPeopleRevisionSnapshot.mockResolvedValue({
        data: { id: YORUBA.id, nameMain: FROZEN_REVISION_NAME },
        version: PINNED_VERSION,
        published_at: "2026-03-01T00:00:00Z",
        confidence: 81,
      });
    },
    composedSequence: () =>
      derivePanelSequence("people", mapPeopleDetail(YORUBA_ROW)),
    // No chapter runs above the parchment to cite it, and the parchment is
    // not a citation of itself.
    printsDossierCitation: false,
    gatesRecord: false,
  },
  {
    segment: "pays",
    entityType: "country",
    slug: NIGERIA.id,
    page: PaysSlugPage,
    liveName: NIGERIA.nameFr,
    recordTestId: "country-record-view",
    primeLiveCorpus: () => {
      getCountryById.mockResolvedValue(NIGERIA_ROW);
      getActiveSourceFlags.mockResolvedValue([]);
    },
    primeFrozenRevision: () => {
      getRevisionSnapshot.mockResolvedValue({
        data: { name_fr: FROZEN_REVISION_NAME },
        version: PINNED_VERSION,
        published_at: "2026-03-01T00:00:00Z",
        confidence: 84,
        doctrine: null,
      });
    },
    composedSequence: () =>
      derivePanelSequence("country", mapCountryDetail(NIGERIA_ROW)),
    printsDossierCitation: false,
    gatesRecord: false,
  },
  {
    segment: "familles",
    entityType: "language-family",
    slug: NIGER_CONGO.id,
    page: FamillesSlugPage,
    liveName: NIGER_CONGO.nameFr,
    recordTestId: "family-record-view",
    primeLiveCorpus: () => {
      getLanguageFamilyById.mockResolvedValue(NIGER_CONGO_ROW);
      getFamilyTreeSkeleton.mockResolvedValue(NIGER_CONGO_TREE);
      getPeoplesByLanguageFamily.mockResolvedValue([]);
    },
    primeFrozenRevision: () => {
      getRevisionSnapshot.mockResolvedValue({
        data: { name_fr: FROZEN_REVISION_NAME },
        version: PINNED_VERSION,
        published_at: "2026-03-01T00:00:00Z",
        confidence: 79,
        doctrine: null,
      });
    },
    composedSequence: () =>
      derivePanelSequence(
        "language-family",
        mapLanguageFamilyDetail(NIGER_CONGO_ROW)
      ),
    printsDossierCitation: true,
    gatesRecord: true,
  },
];

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/**
 * ScalePanel reads the reduced-motion preference; VoicesPanel refetches the
 * narratives client-side to render them.
 *
 * The narrative stub must agree with whatever `listPublicOralNarratives` is
 * primed to return for the route: both read the same rights-filtered corpus in
 * production, so a stub that answers "none" while the server counted some is
 * a state the app cannot actually reach — and it would make the empty-anchor
 * invariant fail on a fixture contradiction rather than on a real defect.
 */
function stubPanelClientRuntime(narratives: unknown[] = []) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: narratives }) })
  );
}

async function renderFiche(route: FicheRouteUnderTest, slug: string) {
  const page = await route.page({
    params: Promise.resolve({ lang: "fr", slug }),
  });
  return render(page as ReactElement);
}

function renderLiveFiche(route: FicheRouteUnderTest) {
  return renderFiche(route, route.slug);
}

function ficheSections(root: Element): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>('section[id^="fiche-"]')
  );
}

function journeyAnchors(root: Element): string[] {
  return ficheSections(root).map((section) => section.id);
}

/**
 * The one dangling citation the fiche layer inherits rather than creates.
 * ConfidenceChip's incomplete-confidence fallback hardcodes `#sources`
 * (src/components/source-transparency/ConfidenceChip.tsx), as does
 * ProseWithChip — but the only `id="sources"` in the tree belongs to the
 * *family* sources footer, so on a people fiche the link resolves to nothing.
 * Lifting those chips out of the legacy view and into the identity and
 * fragmentation chapters made a latent dead link visible.
 *
 * Exempted so the assertion still fails on any *new* dangling anchor. This
 * records a defect to fix, not a property to keep.
 */
const LEGACY_SOURCES_ANCHOR = "#sources";

/** The rights-cleared narratives the voices chapter is built from. */
const PUBLISHED_NARRATIVES = [
  {
    id: "3f1a5f7c-2d0e-4a6b-9c31-0b5f9e2a7d84",
    narrativeCode: "ORL_YORUBA_001",
    narratorDisplayName: "A. O.",
    community: "Ilé-Ifè",
    languageCode: "yor",
    narrativeKind: "testimony",
    summary: "Un récit transmis au sein de la communauté.",
    variantOf: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  // One corpus, two readers: the route counts it server-side to decide the
  // chapter, VoicesPanel refetches it client-side to render it.
  stubPanelClientRuntime(PUBLISHED_NARRATIVES);
  for (const route of FICHE_ROUTES) {
    route.primeLiveCorpus();
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

describe("fiche vivante — journey anchors", () => {
  // @req REQ-091
  it.each(FICHE_ROUTES)(
    "$segment: every anchor names a chapter the composer asked for",
    async (route) => {
      const { container } = await renderLiveFiche(route);

      const composedAnchors = route.composedSequence().map(sectionIdForPanel);
      const rendered = journeyAnchors(container);

      expect(rendered.length).toBeGreaterThan(0);
      for (const anchor of rendered) {
        // An anchor outside the composed sequence is a destination the fiche
        // offers for a chapter it was never asked to tell.
        expect(composedAnchors).toContain(anchor);
      }
    }
  );

  // @req REQ-091
  it.each(FICHE_ROUTES)(
    "$segment: no anchor scrolls to an empty chapter",
    async (route) => {
      const { container } = await renderLiveFiche(route);

      // Retried rather than asserted once: the voices chapter fills from
      // VoicesPanel's own client fetch (REQ-095), so its content lands after
      // the first paint. Everything else is server-rendered and passes on the
      // first attempt.
      await waitFor(() => {
        for (const section of ficheSections(container)) {
          // Catches a panel that resolved but rendered nothing — the registry
          // returning a component is not yet proof the chapter exists.
          expect(
            (section.textContent ?? "").trim(),
            `${section.id} is an anchor onto nothing`
          ).not.toBe("");
        }
      });
    }
  );

  // @req REQ-091
  it.each(FICHE_ROUTES)(
    "$segment: chapters follow the order PANEL_TABLE declares",
    async (route) => {
      const { container } = await renderLiveFiche(route);

      const rendered = journeyAnchors(container);
      const tableOrder = [...PANEL_TABLE]
        .sort((left, right) => left.order - right.order)
        .map((panel) => sectionIdForPanel(panel.kind));

      expect(rendered).toEqual(
        tableOrder.filter((anchor) => rendered.includes(anchor))
      );
    }
  );
});

describe("fiche vivante — the dossier citation contract", () => {
  // @req REQ-091
  it.each(FICHE_ROUTES)(
    "$segment: every citation the fiche prints lands on an anchor that exists",
    async (route) => {
      const { container, getByTestId } = await renderLiveFiche(route);

      const dangling = Array.from(
        container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')
      )
        .map((citation) => citation.getAttribute("href") ?? "")
        .filter((href) => href !== LEGACY_SOURCES_ANCHOR)
        .filter((href) => container.querySelector(href) === null);
      expect(dangling).toEqual([]);

      // ContextTriad (ETNI-818) can also point a "N peuples" counter at the
      // record anchor — that is hierarchy navigation, not a dossier citation,
      // so it is excluded here to keep this assertion about what the panels
      // themselves print.
      const recordAnchor = `#${sectionIdForPanel("record")}`;
      const citationLinksToRecord = Array.from(
        container.querySelectorAll<HTMLAnchorElement>(
          `a[href="${recordAnchor}"]`
        )
      ).filter((link) => !link.closest("[data-context-triad]"));
      expect(citationLinksToRecord.length > 0).toBe(
        route.printsDossierCitation
      );

      // The citation is only a promise kept if the dossier itself is in the
      // DOM at the far end of it, gate closed or not.
      const record = container.querySelector(recordAnchor);
      expect(record).not.toBeNull();
      expect(record).toContainElement(getByTestId(route.recordTestId));
    }
  );
});

describe("fiche vivante — accent scope", () => {
  // @req REQ-091
  it.each(FICHE_ROUTES)(
    "$segment: scopes the whole fiche to its own entity accent and no other",
    async (route) => {
      const { container } = await renderLiveFiche(route);

      const accentRoot = container.querySelector(
        `.${ACCENT_CLASS_BY_ENTITY[route.entityType]}`
      );
      expect(accentRoot).not.toBeNull();
      for (const section of ficheSections(container)) {
        expect(accentRoot).toContainElement(section);
      }

      // A second accent anywhere on the page would repaint part of the fiche
      // in another entity's colour, and the accent would stop meaning anything.
      const foreignAccents = Object.entries(ACCENT_CLASS_BY_ENTITY)
        .filter(([entityType]) => entityType !== route.entityType)
        .map(([, accentClass]) => accentClass);
      for (const accentClass of foreignAccents) {
        expect(container.querySelector(`.${accentClass}`)).toBeNull();
      }
    }
  );
});

describe("fiche vivante — the reading gate", () => {
  // @req REQ-091
  it.each(FICHE_ROUTES)(
    "$segment: gates the dossier exactly as its shape asks, and no more",
    async (route) => {
      const { container, getByTestId } = await renderLiveFiche(route);

      // Two means a route wrapped a record the sequence already gates, burying
      // the dossier under a disclosure inside a disclosure. Zero is the body
      // placement, where the dossier is the page and there is nothing to open.
      expect(container.querySelectorAll("details.reading-gate")).toHaveLength(
        route.gatesRecord ? 1 : 0
      );

      // Gated or not, the dossier itself is always in the DOM.
      expect(getByTestId(route.recordTestId)).toBeInTheDocument();
    }
  );
});

describe("fiche vivante — pinned revisions (DEC-004)", () => {
  // @req REQ-019
  // @req REQ-091
  it.each(FICHE_ROUTES)(
    "$segment: a pinned @v URL shows the stored revision and no chapter at all",
    async (route) => {
      route.primeFrozenRevision();

      const { container } = await renderFiche(
        route,
        `${route.slug}@v${PINNED_VERSION}`
      );

      // The live corpus is primed and still unused: a pinned URL is immutable.
      expect(screen.getByText(FROZEN_REVISION_NAME)).toBeInTheDocument();
      expect(screen.queryByText(route.liveName)).not.toBeInTheDocument();

      expect(journeyAnchors(container)).toEqual([]);
      expect(container.querySelectorAll("details.reading-gate")).toHaveLength(
        0
      );
    }
  );
});
