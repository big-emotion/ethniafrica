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
    it("should export PRODUCT_NAME with default value", async () => {
      const { PRODUCT_NAME } = await import("../brand");
      expect(PRODUCT_NAME).toBe("Atlas des Peuples d'Afrique");
    });

    it("should export CANONICAL_DOMAIN with default value", async () => {
      const { CANONICAL_DOMAIN } = await import("../brand");
      expect(CANONICAL_DOMAIN).toBe("ethniafrica.com");
    });

    it("should export ATTRIBUTION_STRING with default value", async () => {
      const { ATTRIBUTION_STRING } = await import("../brand");
      expect(ATTRIBUTION_STRING).toBe("Fait avec émotion pour l'Afrique");
    });

    it("should export OG_TITLE with default value", async () => {
      const { OG_TITLE } = await import("../brand");
      expect(OG_TITLE).toBe("Atlas des Peuples d'Afrique");
    });

    it("should export OG_DESCRIPTION with default value", async () => {
      const { OG_DESCRIPTION } = await import("../brand");
      expect(OG_DESCRIPTION).toBe(
        "Encyclopédie des peuples, langues et familles linguistiques d'Afrique"
      );
    });

    it("should export SITE_LOCALE with default value", async () => {
      const { SITE_LOCALE } = await import("../brand");
      expect(SITE_LOCALE).toBe("fr");
    });
  });

  describe("environment variable overrides", () => {
    it("should override PRODUCT_NAME via NEXT_PUBLIC_PRODUCT_NAME", async () => {
      process.env.NEXT_PUBLIC_PRODUCT_NAME = "Custom Product Name";
      const { PRODUCT_NAME } = await import("../brand");
      expect(PRODUCT_NAME).toBe("Custom Product Name");
    });

    it("should override CANONICAL_DOMAIN via NEXT_PUBLIC_CANONICAL_DOMAIN", async () => {
      process.env.NEXT_PUBLIC_CANONICAL_DOMAIN = "custom-domain.org";
      const { CANONICAL_DOMAIN } = await import("../brand");
      expect(CANONICAL_DOMAIN).toBe("custom-domain.org");
    });

    it("should override SITE_LOCALE via NEXT_PUBLIC_SITE_LOCALE", async () => {
      process.env.NEXT_PUBLIC_SITE_LOCALE = "en";
      const { SITE_LOCALE } = await import("../brand");
      expect(SITE_LOCALE).toBe("en");
    });
  });
});
