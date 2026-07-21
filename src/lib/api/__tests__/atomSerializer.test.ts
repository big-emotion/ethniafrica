import { describe, it, expect } from "vitest";
import { buildAtomFeed } from "../atomSerializer";
import type { FeedRevisionItem } from "@/api/v2/services/feedRevisions";

const BASE_URL = "https://africahistory.org";
const FEED_URL = "https://africahistory.org/api/v2/feed/revisions";
const UPDATED = "2026-05-21T12:00:00.000Z";

const ITEMS: FeedRevisionItem[] = [
  {
    entity_type: "people",
    entity_id: "PPL_YORUBA",
    slug: "ppl_yoruba",
    version: 3,
    published_at: "2026-05-21T12:00:00.000Z",
    pinned_url: "/api/v2/peoples/PPL_YORUBA/versions/3",
    summary: "Demographics update",
  },
  {
    entity_type: "country",
    entity_id: "ZAF",
    slug: "zaf",
    version: 2,
    published_at: "2026-05-20T10:00:00.000Z",
    pinned_url: "/api/v2/countries/ZAF/versions/2",
    summary: null,
  },
];

describe("buildAtomFeed", () => {
  it("produces valid XML with the Atom namespace declaration", () => {
    const xml = buildAtomFeed(ITEMS, {
      baseUrl: BASE_URL,
      feedUrl: FEED_URL,
      updated: UPDATED,
    });
    expect(xml).toContain('xmlns="http://www.w3.org/2005/Atom"');
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it("includes <title>, <id>, and <updated> in the feed root", () => {
    const xml = buildAtomFeed(ITEMS, {
      baseUrl: BASE_URL,
      feedUrl: FEED_URL,
      updated: UPDATED,
    });
    expect(xml).toContain("<title>");
    expect(xml).toContain("<id>");
    expect(xml).toContain("<updated>");
  });

  it("uses the most recent item published_at as feed <updated>, not current time", () => {
    const xml = buildAtomFeed(ITEMS, {
      baseUrl: BASE_URL,
      feedUrl: FEED_URL,
      updated: "1970-01-01T00:00:00.000Z",
    });
    // Feed <updated> should be the first item's published_at (most recent)
    expect(xml).toContain("<updated>2026-05-21T12:00:00.000Z</updated>");
  });

  it("falls back to options.updated when no items are provided", () => {
    const xml = buildAtomFeed([], {
      baseUrl: BASE_URL,
      feedUrl: FEED_URL,
      updated: "1970-01-01T00:00:00.000Z",
    });
    expect(xml).toContain("<updated>1970-01-01T00:00:00.000Z</updated>");
  });

  it("produces one <entry> per item", () => {
    const xml = buildAtomFeed(ITEMS, {
      baseUrl: BASE_URL,
      feedUrl: FEED_URL,
      updated: UPDATED,
    });
    const entryCount = (xml.match(/<entry>/g) ?? []).length;
    expect(entryCount).toBe(2);
  });

  it("each entry has <id>, <title>, <updated>, <link>, and <summary>", () => {
    const xml = buildAtomFeed(ITEMS, {
      baseUrl: BASE_URL,
      feedUrl: FEED_URL,
      updated: UPDATED,
    });
    // Check first entry content
    expect(xml).toContain("PPL_YORUBA");
    expect(xml).toContain("Demographics update");
    expect(xml).toContain(`${BASE_URL}/api/v2/peoples/PPL_YORUBA/versions/3`);
  });

  it("escapes XML special characters in entity data", () => {
    const items: FeedRevisionItem[] = [
      {
        entity_type: "people",
        entity_id: "PPL_TEST",
        slug: "ppl_test",
        version: 1,
        published_at: "2026-01-01T00:00:00.000Z",
        pinned_url: "/api/v2/peoples/PPL_TEST/versions/1",
        summary: 'Fix <broken> & "quoted" data',
      },
    ];
    const xml = buildAtomFeed(items, {
      baseUrl: BASE_URL,
      feedUrl: FEED_URL,
      updated: UPDATED,
    });
    expect(xml).toContain("Fix &lt;broken&gt; &amp; &quot;quoted&quot; data");
    expect(xml).not.toContain("<broken>");
  });

  it("is idempotent — same inputs produce byte-identical output (NFR32)", () => {
    const options = { baseUrl: BASE_URL, feedUrl: FEED_URL, updated: UPDATED };
    const xml1 = buildAtomFeed(ITEMS, options);
    const xml2 = buildAtomFeed(ITEMS, options);
    expect(xml1).toBe(xml2);
  });
});
