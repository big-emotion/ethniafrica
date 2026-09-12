import { describe, expect, it } from "vitest";

import { fieldHashes, sourceHash } from "@/lib/afrik/translations/hashing";
import { classifierFor } from "@/lib/afrik/translations/leafClassifier";
import { checkRecordPair } from "../../ci/checkTranslationParity";
import {
  deferEnglishTranslation,
  refreshSidecarHashes,
  stripTierProvenance,
  stripTierProvenanceFromRecord,
} from "../stripTierProvenanceNotes";

/**
 * The tiering codemod wrote its reasoning into `sources[].notes`, a field the
 * reader sees verbatim. These fixtures are sentences taken from the corpus;
 * the script must remove exactly them and nothing a curator wrote.
 */
const DOMAIN_RULING = "Tier resolved from the domain ruling for jstor.org.";
const CITATION_SHAPE =
  "Tier inferred from published-citation shape (named author and publication year); no domain ruling applies.";
const AWAITS_REVIEW =
  "No URL and no recognisable citation shape; the tier awaits editorial review.";

describe("stripTierProvenance", () => {
  // @req REQ-133
  it("removes each generated sentence whole", () => {
    for (const sentence of [
      DOMAIN_RULING,
      CITATION_SHAPE,
      AWAITS_REVIEW,
      "Tier resolved from the domain ruling for unfpa.org, matched as a parent of wcaro.unfpa.org.",
      'Tier resolved from the authorized source catalogue entry "ethnologue".',
      'Tier resolved from the authorized source catalogue entry "un-desa-wpp" (un.org), matched as a parent of unstats.un.org.',
      "Tier resolved from the authorized source catalogue entry for UNFPA.",
      "No domain ruling covers kanaga-at.com; the tier awaits editorial review.",
    ]) {
      expect(stripTierProvenance(sentence), sentence).toBe("");
    }
  });

  // @req REQ-133
  it("keeps what a curator wrote around a generated sentence", () => {
    expect(
      stripTierProvenance(
        `${DOMAIN_RULING} Confirms glottocode njeb1242 and ISO 639-3 nzb.`
      )
    ).toBe("Confirms glottocode njeb1242 and ISO 639-3 nzb.");
    expect(
      stripTierProvenance(`Volume read in facsimile. ${CITATION_SHAPE}`)
    ).toBe("Volume read in facsimile.");
  });

  // The original citation string is the citation, not the workshop's
  // reasoning about it.
  // @req REQ-133
  it("keeps a preserved original entry", () => {
    expect(
      stripTierProvenance(
        'Tier resolved from the domain ruling for unfpa.org. Original entry: "UNFPA 2025"'
      )
    ).toBe('Original entry: "UNFPA 2025"');
  });

  // A dot inside a hostname is not the end of a sentence. Reading it as one
  // cut this note after "searchworks.stanford." and published "edu (library
  // catalogue record…)" to the reader.
  // @req REQ-133
  it("never ends a generated sentence on a dot inside a hostname", () => {
    const handWritten =
      "Tier resolved from the domain ruling for searchworks.stanford.edu (library catalogue record for an identifiable, verifiable academic monograph by a specialist of Central African lineage societies).";

    expect(stripTierProvenance(handWritten)).toBe(handWritten);
  });

  // @req REQ-133
  it("leaves a hand-written variant for a curator rather than guessing its edges", () => {
    const handWritten =
      "Tier resolved from the authorized source catalogue entry for Glottolog; supports the Kru classification.";

    expect(stripTierProvenance(handWritten)).toBe(handWritten);
  });
});

describe("stripTierProvenanceFromRecord", () => {
  // @req REQ-133
  it("removes an emptied notes key and leaves every other byte in place", () => {
    const raw = [
      "{",
      '  "id": "PPL_X",',
      '  "content": {',
      '    "summary": "Le mot notes apparaît ici.",',
      '    "sources": [',
      "      {",
      '        "title": "A",',
      '        "tier": "referenced",',
      `        "notes": "${CITATION_SHAPE}"`,
      "      },",
      `      { "notes": "${AWAITS_REVIEW}", "title": "B" },`,
      `      { "title": "C", "notes": "Lu en facsimilé. ${DOMAIN_RULING}" }`,
      "    ]",
      "  },",
      '  "names": [{ "sources": [{ "title": "D", "notes": "' +
        DOMAIN_RULING +
        '" }] }]',
      "}",
      "",
    ].join("\n");

    const { text, rewrittenNotes, removedNotes } =
      stripTierProvenanceFromRecord(raw);

    expect(text).toBe(
      [
        "{",
        '  "id": "PPL_X",',
        '  "content": {',
        '    "summary": "Le mot notes apparaît ici.",',
        '    "sources": [',
        "      {",
        '        "title": "A",',
        '        "tier": "referenced"',
        "      },",
        '      { "title": "B" },',
        '      { "title": "C", "notes": "Lu en facsimilé." }',
        "    ]",
        "  },",
        '  "names": [{ "sources": [{ "title": "D" }] }]',
        "}",
        "",
      ].join("\n")
    );
    expect(rewrittenNotes).toBe(1);
    expect(removedNotes).toBe(3);
  });

  // @req REQ-133
  it("returns a record without generated sentences unchanged", () => {
    const raw =
      '{\n  "sources": [{ "title": "x", "notes": "Read on 9 September 2026." }]\n}\n';

    expect(stripTierProvenanceFromRecord(raw)).toEqual({
      text: raw,
      rewrittenNotes: 0,
      removedNotes: 0,
    });
  });

  // @req REQ-133
  it("refuses to touch a notes field that is not a source's", () => {
    const raw = `{\n  "demographics": { "notes": "${DOMAIN_RULING}" }\n}\n`;

    expect(() => stripTierProvenanceFromRecord(raw)).toThrow(/sources/);
  });
});

describe("deferEnglishTranslation", () => {
  // @req REQ-145
  it("appends the deferral block at the root, in the file's own indentation", () => {
    const raw = '{\n  "id": "PPL_X",\n  "content": {}\n}\n';

    const deferred = deferEnglishTranslation(raw, "Reason.");

    expect(deferred).toBe(
      '{\n  "id": "PPL_X",\n  "content": {},\n  "_translation": {\n    "deferred": {\n      "en": "Reason."\n    }\n  }\n}\n'
    );
  });

  // @req REQ-145
  it("leaves a record that already declares its translation state alone", () => {
    const raw =
      '{\n  "id": "PPL_X",\n  "_translation": { "deferred": { "en": "Earlier reason." } }\n}\n';

    expect(deferEnglishTranslation(raw, "Reason.")).toBe(raw);
  });
});

describe("refreshSidecarHashes", () => {
  const RELATIVE_PATH = "pays/XXX.json";
  const classify = classifierFor("modele-pays.json");

  function countryRecord(notes: string[]): string {
    return (
      JSON.stringify(
        {
          id: "XXX",
          content: {
            sources: notes.map((note, i) => ({ title: `T${i}`, notes: note })),
          },
        },
        null,
        2
      ) + "\n"
    );
  }

  function sidecarFor(
    source: string,
    englishNotes: string[],
    staleFields: string[] = []
  ): string {
    const parsed = JSON.parse(source);
    const hashes = fieldHashes(parsed, classify);
    for (const field of staleFields) hashes[field] = "0000000000000000";
    const sidecar = JSON.parse(countryRecord(englishNotes));
    sidecar._translation = {
      kind: "machine",
      translatedAt: "2026-09-10T00:00:00.000Z",
      sourceHash: sourceHash(parsed, classify),
      fieldHashes: hashes,
      reviewRequired: [],
    };
    return JSON.stringify(sidecar, null, 2) + "\n";
  }

  // @req REQ-145
  it("keeps an in-sync sidecar in sync when both sides lose the same sentences", () => {
    const before = countryRecord([
      DOMAIN_RULING,
      `Lu en facsimilé. ${CITATION_SHAPE}`,
    ]);
    const sidecar = sidecarFor(before, [
      DOMAIN_RULING,
      `Read in facsimile. ${CITATION_SHAPE}`,
    ]);

    const after = stripTierProvenanceFromRecord(before).text;
    const strippedSidecar = stripTierProvenanceFromRecord(sidecar).text;
    const refreshed = refreshSidecarHashes(
      strippedSidecar,
      JSON.parse(before),
      JSON.parse(after),
      RELATIVE_PATH
    );

    expect(
      checkRecordPair({
        relativePath: RELATIVE_PATH,
        lang: "en",
        source: JSON.parse(after),
        sidecar: JSON.parse(refreshed),
      }).findings
    ).toEqual([]);
  });

  // A field that had already drifted before this edit still needs a
  // translator; refreshing its hash would hide that.
  // @req REQ-145
  it("does not launder a field that had already drifted", () => {
    const before = countryRecord([`Lu en facsimilé. ${CITATION_SHAPE}`]);
    const sidecar = sidecarFor(
      before,
      [`Read in facsimile. ${CITATION_SHAPE}`],
      ["content.sources[0].notes"]
    );

    const after = stripTierProvenanceFromRecord(before).text;
    const refreshed = refreshSidecarHashes(
      stripTierProvenanceFromRecord(sidecar).text,
      JSON.parse(before),
      JSON.parse(after),
      RELATIVE_PATH
    );

    expect(
      checkRecordPair({
        relativePath: RELATIVE_PATH,
        lang: "en",
        source: JSON.parse(after),
        sidecar: JSON.parse(refreshed),
      }).findings.map((finding) => finding.field)
    ).toContain("content.sources[0].notes");
  });
});
