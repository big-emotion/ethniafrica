import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("brand", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("default values", () => {
    // @req REQ-019
    it("should export PRODUCT_NAME with default value", async () => {
      const { PRODUCT_NAME } = await import("../brand");
      expect(PRODUCT_NAME).toBe("EthniAfrica");
    });

    // @req REQ-019
    it("should export CANONICAL_DOMAIN with default value", async () => {
      const { CANONICAL_DOMAIN } = await import("../brand");
      expect(CANONICAL_DOMAIN).toBe("ethniafrica.com");
    });

    // @req REQ-019
    it("should export ATTRIBUTION_STRING with default value", async () => {
      const { ATTRIBUTION_STRING } = await import("../brand");
      expect(ATTRIBUTION_STRING).toBe("Fait avec émotion pour l'Afrique");
    });

    // The site's own title, and the only place the brand is qualified: it
    // stands alone in a tab and on a social card, with no masthead beside it
    // to say what EthniAfrica is. PRODUCT_NAME stays the bare brand, because
    // every inner page suffixes it to a title that already has its own
    // qualifier.
    // @req REQ-019
    it("should export OG_TITLE with default value", async () => {
      const { OG_TITLE } = await import("../brand");
      expect(OG_TITLE).toBe("EthniAfrica — Atlas des Peuples d'Afrique");
    });

    // What the sentence must *say* is siteDescription.test.ts's contract,
    // derived from the module registry. Restating the literal here would make
    // every corpus class that ships fail an unrelated suite with a diff of two
    // strings, which is how the sentence came to name four of six: the copy
    // was pinned, and what it owed the reader was not.
    // @req REQ-019
    it("should export a non-empty OG_DESCRIPTION by default", async () => {
      const { OG_DESCRIPTION } = await import("../brand");
      expect(OG_DESCRIPTION.length).toBeGreaterThan(0);
    });

    // @req REQ-019
    it("should export SITE_LOCALE with default value", async () => {
      const { SITE_LOCALE } = await import("../brand");
      expect(SITE_LOCALE).toBe("fr");
    });
  });

  describe("environment variable overrides", () => {
    // @req REQ-019
    it("should override PRODUCT_NAME via NEXT_PUBLIC_PRODUCT_NAME", async () => {
      process.env.NEXT_PUBLIC_PRODUCT_NAME = "Custom Product Name";
      const { PRODUCT_NAME } = await import("../brand");
      expect(PRODUCT_NAME).toBe("Custom Product Name");
    });

    // @req REQ-019
    it("should override CANONICAL_DOMAIN via NEXT_PUBLIC_CANONICAL_DOMAIN", async () => {
      process.env.NEXT_PUBLIC_CANONICAL_DOMAIN = "custom-domain.org";
      const { CANONICAL_DOMAIN } = await import("../brand");
      expect(CANONICAL_DOMAIN).toBe("custom-domain.org");
    });

    // @req REQ-019
    it("should override SITE_LOCALE via NEXT_PUBLIC_SITE_LOCALE", async () => {
      process.env.NEXT_PUBLIC_SITE_LOCALE = "en";
      const { SITE_LOCALE } = await import("../brand");
      expect(SITE_LOCALE).toBe("en");
    });

    // @req REQ-019
    it("should override ATTRIBUTION_STRING via NEXT_PUBLIC_ATTRIBUTION_STRING", async () => {
      process.env.NEXT_PUBLIC_ATTRIBUTION_STRING = "Made with love for Africa";
      const { ATTRIBUTION_STRING } = await import("../brand");
      expect(ATTRIBUTION_STRING).toBe("Made with love for Africa");
    });

    // @req REQ-019
    it("should override OG_TITLE via NEXT_PUBLIC_OG_TITLE", async () => {
      process.env.NEXT_PUBLIC_OG_TITLE = "Custom OG Title";
      const { OG_TITLE } = await import("../brand");
      expect(OG_TITLE).toBe("Custom OG Title");
    });

    // @req REQ-019
    it("should override OG_DESCRIPTION via NEXT_PUBLIC_OG_DESCRIPTION", async () => {
      process.env.NEXT_PUBLIC_OG_DESCRIPTION = "Custom OG description text";
      const { OG_DESCRIPTION } = await import("../brand");
      expect(OG_DESCRIPTION).toBe("Custom OG description text");
    });
  });
});
