import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";

import {
  alignExternalIdentifiers,
  resolveFicheIdentifiers,
  type RegistryClient,
  type WikidataSearchHit,
} from "../alignExternalIdentifiers";

// ─── fake registry client ──────────────────────────────────────────────────
//
// Real network access is provided by `httpRegistryClient` in the script
// itself and is never exercised here — every test supplies this fake so the
// matching logic is verified with zero HTTP calls.

interface FakeClientConfig {
  searchResults?: Record<string, WikidataSearchHit[]>;
  claims?: Record<string, { glottocode?: string; iso639_3?: string }>;
  searchError?: Error;
  claimsError?: Error;
}

function makeFakeClient(config: FakeClientConfig): RegistryClient {
  return {
    async searchWikidata(term: string) {
      if (config.searchError) throw config.searchError;
      return config.searchResults?.[term] ?? [];
    },
    async getClaims(qid: string) {
      if (config.claimsError) throw config.claimsError;
      return config.claims?.[qid] ?? {};
    },
  };
}

// ─── fixture helpers ────────────────────────────────────────────────────────

function writeFLG(root: string, id: string) {
  const dir = join(root, "..", "famille_linguistique");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${id}.json`), JSON.stringify({ id }));
}

/** "PPL_EWE" -> "Ewe" — a display name a fake client's search-result map can key on. */
function toDisplayName(pplId: string): string {
  const bare = pplId.replace("PPL_", "");
  return bare.charAt(0) + bare.slice(1).toLowerCase();
}

function writePPL(
  peopleRoot: string,
  flgFolder: string,
  pplId: string,
  overrides: Record<string, unknown> = {}
) {
  const dir = join(peopleRoot, flgFolder);
  mkdirSync(dir, { recursive: true });
  const displayName = toDisplayName(pplId);
  const base = {
    id: pplId,
    nameMain: displayName,
    languageFamilyId: flgFolder,
    content: {
      appellations: {
        mainName: displayName,
        selfAppellation: displayName,
      },
      languages: { isoCodes: [] },
    },
  };
  const fiche = { ...base, ...overrides };
  writeFileSync(join(dir, `${pplId}.json`), JSON.stringify(fiche, null, 2));
  return fiche;
}

function readPPL(peopleRoot: string, flgFolder: string, pplId: string) {
  return JSON.parse(
    readFileSync(join(peopleRoot, flgFolder, `${pplId}.json`), "utf8")
  );
}

describe("alignExternalIdentifiers", () => {
  let tmpDir: string;
  let peopleRoot: string;
  let reportPath: string;

  beforeEach(() => {
    tmpDir = join(
      __dirname,
      `tmp_test_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    peopleRoot = join(tmpDir, "peuples");
    reportPath = join(tmpDir, "report.json");
    mkdirSync(peopleRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("resolveFicheIdentifiers (pure matching)", () => {
    // @req REQ-128
    it("resolves wikidataId and glottocode from an unambiguous single Wikidata match", async () => {
      const fiche = writePPL(peopleRoot, "FLG_KWA", "PPL_EWE");
      const client = makeFakeClient({
        searchResults: {
          Ewe: [{ id: "Q34266", matchText: "Ewe" }],
        },
        claims: {
          Q34266: { glottocode: "ewee1241" },
        },
      });

      const outcome = await resolveFicheIdentifiers(fiche, client);

      expect(outcome).toEqual({
        status: "aligned",
        identifiers: { wikidataId: "Q34266", glottocode: "ewee1241" },
      });
    });

    // @req REQ-128
    it("derives iso639_3 from the fiche's own single isoCodes entry without any network call", async () => {
      const fiche = writePPL(peopleRoot, "FLG_KWA", "PPL_EWE", {
        content: {
          appellations: { mainName: "Ewe", selfAppellation: "Ewegbe" },
          languages: { isoCodes: ["ewe"] },
        },
      });
      let searchCalled = false;
      const client: RegistryClient = {
        async searchWikidata() {
          searchCalled = true;
          return [];
        },
        async getClaims() {
          throw new Error("must not be called");
        },
      };

      const outcome = await resolveFicheIdentifiers(fiche, client);

      // isoCodes is unambiguous by construction (exactly one entry), so it
      // must resolve even though the Wikidata search below is stubbed to
      // return zero results — but the search still runs for wikidataId, it
      // just yields no-match, and iso639_3 is written anyway.
      expect(searchCalled).toBe(true);
      expect(outcome).toEqual({
        status: "aligned",
        identifiers: { iso639_3: "ewe" },
      });
    });

    // @req REQ-128
    it("falls back to the Wikidata P220 claim when isoCodes has more than one entry", async () => {
      const fiche = writePPL(peopleRoot, "FLG_KWA", "PPL_EWE", {
        content: {
          appellations: { mainName: "Ewe", selfAppellation: "Ewegbe" },
          languages: { isoCodes: ["ewe", "eve"] },
        },
      });
      const client = makeFakeClient({
        searchResults: {
          Ewe: [{ id: "Q34266", matchText: "Ewe" }],
          Ewegbe: [],
        },
        claims: {
          Q34266: { glottocode: "ewee1241", iso639_3: "ewe" },
        },
      });

      const outcome = await resolveFicheIdentifiers(fiche, client);

      expect(outcome).toEqual({
        status: "aligned",
        identifiers: {
          wikidataId: "Q34266",
          glottocode: "ewee1241",
          iso639_3: "ewe",
        },
      });
    });

    // @req REQ-128
    it("leaves a fiche untouched and reports 'no-match' when the Wikidata search returns zero results", async () => {
      const fiche = writePPL(peopleRoot, "FLG_KWA", "PPL_OBSCURE");
      const client = makeFakeClient({ searchResults: {} });

      const outcome = await resolveFicheIdentifiers(fiche, client);

      expect(outcome).toMatchObject({ status: "skipped", reason: "no-match" });
    });

    // @req REQ-128
    it("leaves a fiche untouched and reports 'ambiguous' when two distinct entities exactly match", async () => {
      const fiche = writePPL(peopleRoot, "FLG_KWA", "PPL_TWIN", {
        content: {
          appellations: { mainName: "Twin", selfAppellation: "Twin" },
          languages: { isoCodes: [] },
        },
      });
      const client = makeFakeClient({
        searchResults: {
          Twin: [
            { id: "Q1", matchText: "Twin" },
            { id: "Q2", matchText: "Twin" },
          ],
        },
      });

      const outcome = await resolveFicheIdentifiers(fiche, client);

      expect(outcome).toMatchObject({ status: "skipped", reason: "ambiguous" });
    });

    // @req REQ-128
    it("never counts a prefix match as unambiguous — only a case-insensitive exact label/alias match", async () => {
      const fiche = writePPL(peopleRoot, "FLG_KWA", "PPL_ZULU", {
        content: {
          appellations: { mainName: "Zulu", selfAppellation: "amaZulu" },
          languages: { isoCodes: [] },
        },
      });
      const client = makeFakeClient({
        searchResults: {
          // "Zulu people" contains "Zulu" but is not equal to it.
          Zulu: [{ id: "Q34266", matchText: "Zulu people" }],
          amaZulu: [],
        },
      });

      const outcome = await resolveFicheIdentifiers(fiche, client);

      expect(outcome).toMatchObject({ status: "skipped", reason: "no-match" });
    });

    // @req REQ-128
    it("skips a fiche that already has content.externalIdentifiers set and makes zero client calls", async () => {
      const fiche = writePPL(peopleRoot, "FLG_KWA", "PPL_ALREADY", {
        content: {
          appellations: { mainName: "Already", selfAppellation: "Already" },
          languages: { isoCodes: [] },
          externalIdentifiers: { wikidataId: "Q999" },
        },
      });
      const client: RegistryClient = {
        async searchWikidata() {
          throw new Error("must not be called");
        },
        async getClaims() {
          throw new Error("must not be called");
        },
      };

      const outcome = await resolveFicheIdentifiers(fiche, client);

      expect(outcome).toEqual({ status: "skipped", reason: "already-aligned" });
    });

    // @req REQ-128
    it("reports 'error' when the registry client throws", async () => {
      const fiche = writePPL(peopleRoot, "FLG_KWA", "PPL_BROKEN");
      const client = makeFakeClient({ searchError: new Error("network down") });

      const outcome = await resolveFicheIdentifiers(fiche, client);

      expect(outcome).toMatchObject({ status: "skipped", reason: "error" });
    });
  });

  describe("alignExternalIdentifiers (corpus walk + report)", () => {
    // @req REQ-128
    it("writes externalIdentifiers to the fiche file and omits it from the report", async () => {
      writeFLG(peopleRoot, "FLG_KWA");
      writePPL(peopleRoot, "FLG_KWA", "PPL_EWE");
      const client = makeFakeClient({
        searchResults: { Ewe: [{ id: "Q34266", matchText: "Ewe" }] },
        claims: { Q34266: { glottocode: "ewee1241" } },
      });

      const result = await alignExternalIdentifiers({
        peopleRoot,
        reportPath,
        client,
      });

      expect(result.fichesAligned).toBe(1);
      expect(result.report).toEqual([]);
      const written = readPPL(peopleRoot, "FLG_KWA", "PPL_EWE");
      expect(written.content.externalIdentifiers).toEqual({
        wikidataId: "Q34266",
        glottocode: "ewee1241",
      });
    });

    // @req REQ-128
    it("routes unmatched fiches to a deterministic report sorted by PPL id", async () => {
      writeFLG(peopleRoot, "FLG_KWA");
      writePPL(peopleRoot, "FLG_KWA", "PPL_ZEBRA");
      writePPL(peopleRoot, "FLG_KWA", "PPL_ALPHA");
      const client = makeFakeClient({ searchResults: {} });

      const result = await alignExternalIdentifiers({
        peopleRoot,
        reportPath,
        client,
      });

      expect(result.fichesAligned).toBe(0);
      expect(result.report.map((entry) => entry.id)).toEqual([
        "PPL_ALPHA",
        "PPL_ZEBRA",
      ]);
      expect(result.report.every((entry) => entry.reason === "no-match")).toBe(
        true
      );
      expect(existsSync(reportPath)).toBe(true);
      expect(JSON.parse(readFileSync(reportPath, "utf8"))).toEqual(
        result.report
      );
    });

    // @req REQ-128
    it("is idempotent: re-running against an already-aligned corpus changes nothing", async () => {
      writeFLG(peopleRoot, "FLG_KWA");
      writePPL(peopleRoot, "FLG_KWA", "PPL_EWE");
      const client = makeFakeClient({
        searchResults: { Ewe: [{ id: "Q34266", matchText: "Ewe" }] },
        claims: { Q34266: { glottocode: "ewee1241" } },
      });

      await alignExternalIdentifiers({ peopleRoot, reportPath, client });
      const afterFirstRun = readFileSync(
        join(peopleRoot, "FLG_KWA", "PPL_EWE.json"),
        "utf8"
      );

      // A second run must not call the client at all — everything is
      // already-aligned — so a throwing client proves nothing was re-fetched.
      const explodingClient: RegistryClient = {
        async searchWikidata() {
          throw new Error("must not be called on an already-aligned fiche");
        },
        async getClaims() {
          throw new Error("must not be called on an already-aligned fiche");
        },
      };
      const result = await alignExternalIdentifiers({
        peopleRoot,
        reportPath,
        client: explodingClient,
      });

      expect(result.fichesAligned).toBe(0);
      expect(result.report).toEqual([
        {
          id: "PPL_EWE",
          nameMain: "Ewe",
          reason: "already-aligned",
        },
      ]);
      const afterSecondRun = readFileSync(
        join(peopleRoot, "FLG_KWA", "PPL_EWE.json"),
        "utf8"
      );
      expect(afterSecondRun).toBe(afterFirstRun);
    });
  });
});
