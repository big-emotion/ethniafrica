import { describe, expect, it } from "vitest";
import {
  looksLikePublishedCitation,
  replaceSourceArrays,
  transformSourceEntry,
  transformSourceList,
} from "../tierStringSources";

/**
 * Every fixture below is a verbatim `sources` entry taken from
 * dataset/source/afrik. Invented strings would only prove the regexes match
 * themselves; the corpus is what the codemod has to survive.
 */

describe("transformSourceEntry", () => {
  // @req REQ-092
  it("tiers a catalogue domain as official and keeps the citation text as the title", () => {
    const entry = transformSourceEntry(
      "SIL Ethnologue — Bilen language (byn). https://www.ethnologue.com/language/byn/"
    );

    expect(entry).toEqual({
      title: "SIL Ethnologue — Bilen language (byn)",
      url: "https://www.ethnologue.com/language/byn/",
      tier: "official",
      notes:
        'Tier resolved from the authorized source catalogue entry "ethnologue".',
    });
  });

  // @req REQ-092
  it("tiers a ruled press domain as referenced", () => {
    const entry = transformSourceEntry(
      "The Tonga: Left High and Dry – The New Humanitarian, 2007 (https://www.thenewhumanitarian.org/report/74139/zambia-zimbabwe-tonga-left-high-and-dry)"
    );

    expect(entry.tier).toBe("referenced");
    expect(entry.url).toBe(
      "https://www.thenewhumanitarian.org/report/74139/zambia-zimbabwe-tonga-left-high-and-dry"
    );
    expect(entry.title).toBe(
      "The Tonga: Left High and Dry – The New Humanitarian, 2007"
    );
  });

  // @req REQ-092
  it("tiers an aggregator as unverified rather than dropping it", () => {
    const entry = transformSourceEntry(
      "101 Last Tribes – Tetela people, 2024 (https://www.101lasttribes.com/tribes/tetela.html)"
    );

    expect(entry.tier).toBe("unverified");
    expect(entry.notes).toContain("101lasttribes.com");
  });

  // @req REQ-092
  it("falls back to the parent domain ruling for an unlisted subdomain", () => {
    const entry = transformSourceEntry(
      "[UNFPA] ([2025]) – *West & Central Africa Regional Profiles*. [https://wcaro.unfpa.org/en/overview]"
    );

    expect(entry.tier).toBe("official");
    expect(entry.notes).toContain("wcaro.unfpa.org");
    expect(entry.notes).toContain("unfpa.org");
  });

  // @req REQ-092
  it("keeps the original entry verbatim when a string cites more than one URL", () => {
    const original =
      "The DHS Program / ICF – Nigeria Demographic and Health Survey 2018 https://dhsprogram.com/pubs/pdf/FR359/FR359.pdf et la fiche pays https://www.unfpa.org/data/world-population/NG";
    const entry = transformSourceEntry(original);

    expect(entry.url).toBe("https://dhsprogram.com/pubs/pdf/FR359/FR359.pdf");
    expect(entry.tier).toBe("official");
    expect(entry.notes).toContain(original);
  });

  // @req REQ-092
  it("treats a markdown link that repeats its own URL as a single citation", () => {
    const entry = transformSourceEntry(
      "Watters, John R. (éd.) (2003) – *East Benue-Congo: Nouns, pronouns, and verbs*. Language Science Press. [https://langsci-press.org/catalog/book/190](https://langsci-press.org/catalog/book/190)"
    );

    expect(entry.url).toBe("https://langsci-press.org/catalog/book/190");
    expect(entry.notes).not.toContain("Original entry");
  });

  // @req REQ-092
  it("tiers a URL-less published citation as referenced and records why", () => {
    const entry = transformSourceEntry(
      "Ehret, Christopher (2001) – *A Historical-Comparative Reconstruction of Nilo-Saharan*. Cologne: Rüdiger Köppe Verlag."
    );

    expect(entry).toEqual({
      title:
        "Ehret, Christopher (2001) – *A Historical-Comparative Reconstruction of Nilo-Saharan*. Cologne: Rüdiger Köppe Verlag",
      url: null,
      tier: "referenced",
      notes:
        "Tier inferred from published-citation shape (named author and publication year); no domain ruling applies.",
    });
  });

  // @req REQ-092
  it("leaves a vague URL-less reference at needs_review instead of guessing", () => {
    const entry = transformSourceEntry("Recensements nationaux sud-africains");

    expect(entry.tier).toBe("needs_review");
    expect(entry.url).toBeNull();
    expect(entry.notes).toContain("editorial review");
  });

  // @req REQ-092
  it("leaves an unruled domain at needs_review instead of guessing", () => {
    const entry = transformSourceEntry(
      "Kanaga Africa Tours – The powerful Talensi fetishes in the Tongo Hills: https://www.kanaga-at.com/en/trip-info/ghana-en/the-powerful-talensi-fetishes-in-the-tongo-hills/"
    );

    expect(entry.tier).toBe("needs_review");
    expect(entry.notes).toContain("kanaga-at.com");
  });

  // @req REQ-092
  it("keeps the original text when stripping the URL would empty the title", () => {
    const original = "https://www.ethnologue.com/language/lia/";
    const entry = transformSourceEntry(original);

    expect(entry.title).toBe(original);
    expect(entry.url).toBe(original);
    expect(entry.notes).toContain(original);
  });

  // @req REQ-092
  it("passes an already-structured entry through untouched", () => {
    const structured = {
      title: "Glottolog 5.3 - Narrow Bantu",
      url: "https://glottolog.org/resource/languoid/id/narr1281",
      year: 2025,
      tier: 1,
      notes: "",
    };

    expect(transformSourceEntry(structured)).toBe(structured);
  });
});

describe("looksLikePublishedCitation", () => {
  // @req REQ-092
  it("accepts an author-year citation", () => {
    expect(
      looksLikePublishedCitation(
        "Güldemann, Tom (2018) – *The Languages and Linguistics of Africa*. De Gruyter Mouton."
      )
    ).toBe(true);
  });

  // @req REQ-092
  it("rejects an institution-dash-topic reference that merely carries a year", () => {
    expect(
      looksLikePublishedCitation("ONU – Données démographiques 2025")
    ).toBe(false);
  });

  // @req REQ-092
  it("rejects a named work with no publication year", () => {
    expect(
      looksLikePublishedCitation(
        "CIA World Factbook – Central African Republic"
      )
    ).toBe(false);
  });
});

describe("transformSourceList", () => {
  // @req REQ-092
  it("transforms strings and leaves structured entries in place", () => {
    const structured = { title: "x", url: null, tier: "official", notes: "" };
    const list = transformSourceList([
      "Recensements nationaux sud-africains",
      structured,
    ]);

    expect(list[0]).toMatchObject({ tier: "needs_review" });
    expect(list[1]).toBe(structured);
  });
});

describe("replaceSourceArrays", () => {
  // @req REQ-092
  it("rewrites only the sources array and leaves the rest of the file byte-identical", () => {
    const raw = [
      "{",
      '  "id": "PPL_TEST",',
      '  "content": {',
      '    "summary": "Une phrase qui contient le mot sources et des accolades {}.",',
      '    "sources": ["Recensements nationaux sud-africains"]',
      "  }",
      "}",
      "",
    ].join("\n");

    const rewritten = replaceSourceArrays(raw);

    expect(rewritten).toContain(
      '"summary": "Une phrase qui contient le mot sources et des accolades {}."'
    );
    expect(rewritten).toContain('"tier": "needs_review"');
    expect(JSON.parse(rewritten).content.sources).toHaveLength(1);
  });

  // @req REQ-092
  it("returns the input unchanged when no sources array holds a legacy string", () => {
    const raw =
      '{\n  "sources": [{ "title": "x", "url": null, "tier": 1 }]\n}\n';

    expect(replaceSourceArrays(raw)).toBe(raw);
  });
});
