import { describe, it, expect } from "vitest";

import { buildExternalRegistryLinks } from "../externalRegistryLinks";

describe("buildExternalRegistryLinks", () => {
  // @req REQ-128
  it("builds one link per identifier, in Wikidata/Glottolog/ISO 639-3 order", () => {
    const links = buildExternalRegistryLinks({
      wikidataId: "Q34266",
      glottocode: "ewee1241",
      iso639_3: "ewe",
    });

    expect(links).toEqual([
      { label: "Wikidata", url: "https://www.wikidata.org/wiki/Q34266" },
      {
        label: "Glottolog",
        url: "https://glottolog.org/resource/languoid/id/ewee1241",
      },
      { label: "ISO 639-3", url: "https://iso639-3.sil.org/code/ewe" },
    ]);
  });

  // @req REQ-128
  it("builds a single link when only one identifier is present", () => {
    const links = buildExternalRegistryLinks({ glottocode: "ewee1241" });

    expect(links).toEqual([
      {
        label: "Glottolog",
        url: "https://glottolog.org/resource/languoid/id/ewee1241",
      },
    ]);
  });

  // @req REQ-128
  it("returns an empty array when no identifier is present", () => {
    expect(buildExternalRegistryLinks({})).toEqual([]);
  });

  // @req REQ-128
  it("returns an empty array when identifiers is undefined", () => {
    expect(buildExternalRegistryLinks(undefined)).toEqual([]);
  });

  // @req REQ-128
  it("returns an empty array when identifiers is null", () => {
    expect(buildExternalRegistryLinks(null)).toEqual([]);
  });
});
