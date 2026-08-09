/**
 * Tests for deriveIdentityViewModel (ETNI-811 / ETNI-895, Epic 15 Story 15.3, FR96).
 */

import { describe, it, expect } from "vitest";
import { deriveIdentityViewModel } from "@/lib/identityViewModel";
import type { PeopleNamesDossier } from "@/api/v2/schemas/names";

const baseDossier: PeopleNamesDossier = {
  peopleId: "PPL_YORUBA",
  autonym: null,
  names: [],
};

describe("deriveIdentityViewModel", () => {
  // @req REQ-091
  it("selects the endonym record as primary with its languageOfOrigin", () => {
    const dossier: PeopleNamesDossier = {
      ...baseDossier,
      names: [
        {
          id: "1",
          nameText: "Yorùbá ènìyàn",
          nameType: "endonym",
          languageOfOrigin: "yor",
          meaning: null,
          periodLabel: null,
          imposition: null,
          assertionId: "a1",
          sources: [
            {
              id: "s1",
              title: "SIL Ethnologue",
              url: "https://x",
              year: 2020,
              tier: "1",
            },
          ],
          confidence: { score: 90, recomputedAt: "2026-01-01" },
        },
      ],
    };

    const vm = deriveIdentityViewModel(dossier, "Yoruba");

    expect(vm.primaryText).toBe("Yorùbá ènìyàn");
    expect(vm.primaryLang).toBe("yor");
    expect(vm.isFallback).toBe(false);
    expect(vm.sourceLine).toEqual({
      label: "SIL Ethnologue",
      href: "https://x",
    });
  });

  // @req REQ-091
  it("exposes imposition fields when an imposed record exists", () => {
    const dossier: PeopleNamesDossier = {
      ...baseDossier,
      names: [
        {
          id: "1",
          nameText: "Yorùbá ènìyàn",
          nameType: "endonym",
          languageOfOrigin: "yor",
          meaning: null,
          periodLabel: null,
          imposition: null,
          assertionId: "a1",
          sources: [],
          confidence: null,
        },
        {
          id: "2",
          nameText: "Yoruba",
          nameType: "exonym",
          languageOfOrigin: null,
          meaning: null,
          periodLabel: null,
          imposition: {
            imposedBy: "administration coloniale britannique",
            impositionPeriod: "1900-1960",
            whyProblematic: "efface l'auto-appellation",
            contemporaryUsage: "encore utilisé administrativement",
          },
          assertionId: "a2",
          sources: [],
          confidence: null,
        },
      ],
    };

    const vm = deriveIdentityViewModel(dossier, "Yoruba");

    expect(vm.secondaryText).toBe("Yoruba");
    expect(vm.imposition).toEqual({
      imposedBy: "administration coloniale britannique",
      impositionPeriod: "1900-1960",
      whyProblematic: "efface l'auto-appellation",
      contemporaryUsage: "encore utilisé administrativement",
    });
  });

  // @req REQ-091
  it("returns a null imposition when no record has imposedBy", () => {
    const dossier: PeopleNamesDossier = {
      ...baseDossier,
      names: [
        {
          id: "1",
          nameText: "Yorùbá ènìyàn",
          nameType: "endonym",
          languageOfOrigin: "yor",
          meaning: null,
          periodLabel: null,
          imposition: null,
          assertionId: "a1",
          sources: [],
          confidence: null,
        },
      ],
    };

    const vm = deriveIdentityViewModel(dossier, "Yoruba");

    expect(vm.imposition).toBeNull();
  });

  // @req REQ-091
  it("falls back to the canonical AFRIK name with no lang claim when there is no endonym record", () => {
    const vm = deriveIdentityViewModel(baseDossier, "Yoruba");

    expect(vm.primaryText).toBe("Yoruba");
    expect(vm.primaryLang).toBeNull();
    expect(vm.isFallback).toBe(true);
    expect(vm.sourceLine).toEqual({ label: "Source : fiche AFRIK" });
    expect(vm.imposition).toBeNull();
  });

  // @req REQ-091
  it("never fabricates an endonym: fallback ignores exonym-only records for the primary text", () => {
    const dossier: PeopleNamesDossier = {
      ...baseDossier,
      names: [
        {
          id: "2",
          nameText: "Yoruba",
          nameType: "exonym",
          languageOfOrigin: "eng",
          meaning: null,
          periodLabel: null,
          imposition: null,
          assertionId: "a2",
          sources: [],
          confidence: null,
        },
      ],
    };

    const vm = deriveIdentityViewModel(dossier, "Yoruba");

    expect(vm.isFallback).toBe(true);
    expect(vm.primaryText).toBe("Yoruba");
    expect(vm.primaryLang).toBeNull();
  });
});
