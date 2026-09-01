import { describe, expect, it } from "vitest";
import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";
import { modulesNamedIn } from "@/test/axisModuleVocabulary";
import { getTranslation } from "@/lib/translations";

/**
 * A hub blurb describes the axis, not the reader.
 *
 * The three axes are still filed by one criterion — what a reader hands in,
 * what the axis hands back — but that is the shelving rule, and stating it
 * as « il arrive avec…, il repart avec… » spent the opening sentence of
 * three pages, and their three meta descriptions, on a figure of speech
 * where a description was owed. These tests assert the frame that replaced
 * it without pinning the prose: the wording stays editorial.
 */
describe("hub blurbs", () => {
  const { hubs } = getTranslation("fr");
  const axes = ["atlas", "dossiers", "jeux"] as const;

  // The hub paragraph renders inside max-w-[58ch]; past ~140 characters it
  // overflows the two lines the layout reserves for it.
  const BLURB_MAX_LENGTH = 140;

  // @req REQ-114
  it("names what the axis holds rather than narrating the reader", () => {
    for (const axis of axes) {
      expect(hubs[axis].blurb).not.toMatch(/\bil arrive\b/i);
      expect(hubs[axis].blurb).not.toMatch(/\bil repart\b/i);
      expect(hubs[axis].blurb).toMatch(/^L'axe /);
    }
  });

  // The same rewrite has to reach the home's cards: a reader who read the
  // formula on /fr and the description on /fr/atlas would be looking at
  // two different products.
  // @req REQ-113
  it("keeps the header panel's blurbs free of the formula too", () => {
    for (const axis of axes) {
      expect(hubs[axis].menuBlurb).not.toMatch(/\bil arrive\b/i);
      expect(hubs[axis].menuBlurb).not.toMatch(/\bil repart\b/i);
    }
  });

  // @req REQ-114
  it("keeps every blurb within the paragraph width budget", () => {
    for (const axis of axes) {
      expect(hubs[axis].blurb.trim().length).toBeGreaterThan(0);
      expect(hubs[axis].blurb.length).toBeLessThanOrEqual(BLURB_MAX_LENGTH);
    }
  });

  // @req REQ-114
  it("gives each axis its own promise rather than a shared template", () => {
    const blurbs = axes.map((axis) => hubs[axis].blurb);

    expect(new Set(blurbs).size).toBe(axes.length);
  });
});

/**
 * The header panel's sentence describes what is listed under it.
 *
 * It used to state the occasion for choosing the axis — « Quand on sait ce
 * qu'on cherche », « Quand on veut se tester » — to a reader who is looking
 * straight at the module list and wants to know what those modules are. The
 * panel is the one place where the answer is a list of contents, so the
 * sentence now names them.
 */
describe("header panel blurbs", () => {
  const { hubs } = getTranslation("fr");
  const axes = ["atlas", "dossiers", "jeux"] as const;

  // `.sh-panel-blurb` caps at 52ch and sits on the panel header row, above
  // the module grid, which reserves two lines for it. 104 is those two lines.
  // The panel is desktop-only: the mobile tray lists the modules themselves
  // and never renders this sentence, so there is no narrower budget to meet.
  const MENU_BLURB_MAX_LENGTH = 2 * 52;

  // @req REQ-113
  it("names at least two of the modules the panel lists underneath", () => {
    for (const axis of axes) {
      expect(
        modulesNamedIn(axis, hubs[axis].menuBlurb).length
      ).toBeGreaterThanOrEqual(2);
    }
  });

  // @req REQ-113
  it("describes the contents rather than the occasion for choosing the axis", () => {
    for (const axis of axes) {
      expect(hubs[axis].menuBlurb).not.toMatch(/^Quand on /);
    }
  });

  // @req REQ-113
  it("keeps every panel blurb within the two lines the panel reserves", () => {
    for (const axis of axes) {
      expect(hubs[axis].menuBlurb.trim().length).toBeGreaterThan(0);
      expect(hubs[axis].menuBlurb.length).toBeLessThanOrEqual(
        MENU_BLURB_MAX_LENGTH
      );
    }
  });
});

/**
 * The band above a hub names the page, not the product.
 *
 * It used to fall back to the product name, so `/fr/dossiers` opened on
 * « Atlas des Peuples d'Afrique » — already spelled out in the bar directly
 * above it — and told a reader nothing about where they stood. The title the
 * band now carries states the axis *and* what the axis leads into, which is
 * the hierarchy the URL encodes.
 */
describe("hub page titles", () => {
  const { hubs, title } = getTranslation("fr");
  const axes = ["atlas", "dossiers", "jeux"] as const;

  // @req REQ-114
  it("keeps the short axis labels on the canonical access-mode map", () => {
    for (const axis of axes) {
      expect(hubs[axis].title).toBe(ACCESS_MODE_LABELS[axis]);
    }
  });

  // @req REQ-114
  it("names the corpus the axis leads into rather than the product", () => {
    for (const axis of axes) {
      expect(hubs[axis].pageTitle).toMatch(/peuples d'Afrique$/);
      expect(hubs[axis].pageTitle).not.toBe(title);
    }
  });

  // @req REQ-114
  it("gives each axis its own band title", () => {
    const pageTitles = axes.map((axis) => hubs[axis].pageTitle);

    expect(new Set(pageTitles).size).toBe(axes.length);
  });
});
