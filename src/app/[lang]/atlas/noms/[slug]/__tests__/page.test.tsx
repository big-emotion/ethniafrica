import { beforeEach, describe, expect, it, vi } from "vitest";

import { CANONICAL_DOMAIN } from "@/lib/brand";
import { getPatronymeRoute } from "@/lib/routing";
import type { PatronymeSource } from "@/lib/patronymes/content";

/**
 * What a name fiche asks a crawler to do with it (REQ-147).
 *
 * A dossier resting only on `unverified` citations is published — the Source
 * Tier Policy is explicit that nothing is suppressed for being weak — but
 * publishing it is not the same as offering it to a search index as an answer.
 * The threshold is the dossier's best tier, and the canonical is unaffected by
 * it: indexability and identity are two different questions.
 */

const { getPatronymeByIdMock } = vi.hoisted(() => ({
  getPatronymeByIdMock: vi.fn(),
}));

vi.mock("@/api/v2/services/patronymes", () => ({
  getPatronymeById: getPatronymeByIdMock,
}));

import { generateMetadata } from "../page";

const KEITA_ROUTE = `https://${CANONICAL_DOMAIN}${getPatronymeRoute(
  "fr",
  "PAT_KEITA"
)}`;

function dossierCiting(...sources: PatronymeSource[]) {
  return {
    id: "PAT_KEITA",
    nameMain: "Keïta",
    nameSystem: "clan_name",
    casteOrSocialFunction: null,
    content: { sources },
    associatedPeoples: [],
    associatedCountries: [],
    bearers: [],
    alliances: [],
  };
}

function metadataFor(slug: string) {
  return generateMetadata({ params: Promise.resolve({ lang: "fr", slug }) });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the name fiche's indexing directive", () => {
  // @req REQ-147
  it("withholds a name resting only on unverified sources from the index", async () => {
    getPatronymeByIdMock.mockResolvedValue(
      dossierCiting({
        title: "Un blog de généalogie",
        url: null,
        tier: "unverified",
      })
    );

    const metadata = await metadataFor("PAT_KEITA");

    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(KEITA_ROUTE);
  });

  // @req REQ-147
  it("withholds a name whose dossier cites nothing readable", async () => {
    getPatronymeByIdMock.mockResolvedValue(dossierCiting());

    const metadata = await metadataFor("PAT_KEITA");

    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  // @req REQ-147
  it("leaves a referenced name free to be indexed", async () => {
    getPatronymeByIdMock.mockResolvedValue(
      dossierCiting(
        { title: "Un blog de généalogie", url: null, tier: "unverified" },
        { title: "Niane, Soundjata", url: null, tier: "referenced" }
      )
    );

    const metadata = await metadataFor("PAT_KEITA");

    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(KEITA_ROUTE);
  });

  // @req REQ-147
  it("leaves an official name free to be indexed", async () => {
    getPatronymeByIdMock.mockResolvedValue(
      dossierCiting({ title: "SIL Ethnologue", url: null, tier: "official" })
    );

    const metadata = await metadataFor("PAT_KEITA");

    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(KEITA_ROUTE);
  });

  // @req REQ-147
  it("declares nothing at all for a slug that names no fiche", async () => {
    getPatronymeByIdMock.mockResolvedValue(null);

    const metadata = await metadataFor("PAT_INCONNU");

    expect(metadata.alternates).toBeUndefined();
    expect(metadata.robots).toBeUndefined();
  });

  /**
   * An unreachable corpus is not a weak dossier. Answering `noindex` to a
   * timeout would de-list a sourced fiche on a transient failure, so a read
   * that fails leaves the metadata exactly as it was before REQ-147.
   */
  // @req REQ-147
  it("keeps a name indexable when the dossier cannot be read", async () => {
    getPatronymeByIdMock.mockRejectedValue(new Error("database unavailable"));

    const metadata = await metadataFor("PAT_KEITA");

    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(KEITA_ROUTE);
  });
});
