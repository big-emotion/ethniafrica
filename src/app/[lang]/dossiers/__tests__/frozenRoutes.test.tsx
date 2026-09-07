import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import NommerPage from "../nommer/page";
import NommerLaChosePage from "../nommer/la-chose/page";
import NommerLaLanguePage from "../nommer/la-langue/page";
import NommerLaPersonnePage from "../nommer/la-personne/page";
import NommerLePaysPage from "../nommer/le-pays/page";
import NommerLePeuplePage from "../nommer/le-peuple/page";
import MigrationsPage from "../migrations/page";
import ColonizationPage from "../regards/colonisation-et-resistances/page";
import DossierRoute from "../[dossier]/page";
import ThemePage from "../themes/[theme]/page";
import AnecdotesPage from "../anecdotes/page";
import { readDossierCorpus } from "@/lib/dossiers/corpus";
import { DOSSIER_THEMES } from "@/lib/dossiers/themes";

type RouteComponent = (props: {
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string>>;
}) => Promise<unknown>;

/**
 * The half of the freeze the reader can check with a URL bar.
 *
 * Marking a module **Bientôt** in the menu and leaving its page readable is
 * the exact defect that prompted this work: the entry said "not yet" and the
 * link said 200. Every withdrawn dossier is asserted here through the route
 * component a request actually reaches, not through the registry flag, so a
 * route that forgets the guard fails even while the flag is correct.
 */
const WITHDRAWN_ROUTES: Array<[string, RouteComponent]> = [
  ["dossiers/nommer", NommerPage],
  ["dossiers/nommer/la-chose", NommerLaChosePage],
  ["dossiers/nommer/la-langue", NommerLaLanguePage],
  ["dossiers/nommer/la-personne", NommerLaPersonnePage],
  ["dossiers/nommer/le-pays", NommerLePaysPage],
  ["dossiers/nommer/le-peuple", NommerLePeuplePage],
  ["dossiers/migrations", MigrationsPage],
  ["dossiers/regards/colonisation-et-resistances", ColonizationPage],
];

describe("the frozen dossiers serve nothing", () => {
  for (const [route, Page] of WITHDRAWN_ROUTES) {
    // @req REQ-113
    it(`answers 404 on /fr/${route}`, async () => {
      await expect(
        Page({ params: Promise.resolve({ lang: "fr" }) })
      ).rejects.toThrow("NEXT_NOT_FOUND");
    });

    // A freeze that covered one locale would serve the same withdrawn text
    // one URL over.
    // @req REQ-140
    it(`answers 404 on /en/${route}`, async () => {
      await expect(
        Page({ params: Promise.resolve({ lang: "en" }) })
      ).rejects.toThrow("NEXT_NOT_FOUND");
    });
  }

  // @req REQ-113
  it("answers 404 on every dossier of the Réalités vertical", async () => {
    const slugs = readDossierCorpus().dossiers.map((dossier) => dossier.slug);
    expect(slugs.length).toBeGreaterThan(0);

    for (const slug of slugs) {
      await expect(
        DossierRoute({ params: Promise.resolve({ lang: "fr", dossier: slug }) })
      ).rejects.toThrow("NEXT_NOT_FOUND");
    }
  });

  // With every dossier withdrawn, a theme page is a filter over an empty set.
  // It already 404s by construction — this holds that, so the freeze cannot
  // leave eight pages listing nothing.
  // @req REQ-113
  it("answers 404 on every theme page", async () => {
    for (const theme of DOSSIER_THEMES) {
      await expect(
        ThemePage({ params: Promise.resolve({ lang: "fr", theme: theme.id }) })
      ).rejects.toThrow("NEXT_NOT_FOUND");
    }
  });

  // The one that stays. Asserted beside the withdrawals rather than in its
  // own file, because "everything but this" is the whole decision.
  // @req REQ-113
  it("keeps serving the anecdotes", async () => {
    await expect(
      AnecdotesPage({
        params: Promise.resolve({ lang: "fr" }),
        searchParams: Promise.resolve({}),
      })
    ).resolves.toBeTruthy();
  });
});
