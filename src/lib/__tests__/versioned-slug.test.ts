import { describe, it, expect } from "vitest";
import { parseVersionedSlug } from "../versioned-slug";

describe("parseVersionedSlug", () => {
  describe("live mode — no version suffix", () => {
    it("returns live mode for a plain slug", () => {
      expect(parseVersionedSlug("PPL_BAKONGO")).toEqual({
        slug: "PPL_BAKONGO",
        mode: "live",
      });
    });

    it("returns live mode for a country ISO code", () => {
      expect(parseVersionedSlug("COM")).toEqual({ slug: "COM", mode: "live" });
    });

    it("returns live mode for a family ID", () => {
      expect(parseVersionedSlug("FLG_BANTU")).toEqual({
        slug: "FLG_BANTU",
        mode: "live",
      });
    });
  });

  describe("pinned mode — valid @v{integer} suffix", () => {
    it("parses @v1", () => {
      expect(parseVersionedSlug("PPL_BAKONGO@v1")).toEqual({
        slug: "PPL_BAKONGO",
        mode: "pinned",
        version: 1,
      });
    });

    it("parses @v34", () => {
      expect(parseVersionedSlug("PPL_BAKONGO@v34")).toEqual({
        slug: "PPL_BAKONGO",
        mode: "pinned",
        version: 34,
      });
    });

    it("parses large version numbers", () => {
      expect(parseVersionedSlug("COM@v9999")).toEqual({
        slug: "COM",
        mode: "pinned",
        version: 9999,
      });
    });
  });

  describe("latest mode — @latest suffix", () => {
    it("parses @latest", () => {
      expect(parseVersionedSlug("PPL_BAKONGO@latest")).toEqual({
        slug: "PPL_BAKONGO",
        mode: "latest",
      });
    });

    it("parses @latest for a country", () => {
      expect(parseVersionedSlug("COM@latest")).toEqual({
        slug: "COM",
        mode: "latest",
      });
    });
  });

  describe("invalid suffix — returns null", () => {
    it("rejects uppercase V (@V34)", () => {
      expect(parseVersionedSlug("PPL_BAKONGO@V34")).toBeNull();
    });

    it("rejects decimal version (@v34.1)", () => {
      expect(parseVersionedSlug("PPL_BAKONGO@v34.1")).toBeNull();
    });

    it("rejects zero version (@v0)", () => {
      expect(parseVersionedSlug("PPL_BAKONGO@v0")).toBeNull();
    });

    it("rejects negative version (@v-1)", () => {
      expect(parseVersionedSlug("PPL_BAKONGO@v-1")).toBeNull();
    });

    it("rejects @VERSION", () => {
      expect(parseVersionedSlug("PPL_BAKONGO@VERSION")).toBeNull();
    });

    it("rejects @vABC (non-integer)", () => {
      expect(parseVersionedSlug("PPL_BAKONGO@vABC")).toBeNull();
    });

    it("rejects empty slug before @", () => {
      expect(parseVersionedSlug("@v34")).toBeNull();
    });

    it("rejects empty slug with @latest", () => {
      expect(parseVersionedSlug("@latest")).toBeNull();
    });
  });
});
