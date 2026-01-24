import { describe, it, expect, beforeEach } from "vitest";
import { listPeoplesHandler, getPeopleHandler } from "../peoples";
import { clearPeopleCache } from "@/lib/afrik/loaders/peopleLoader";

/**
 * TDD Phase: RED
 * Test: Peoples Handler - API handlers for peoples
 */
describe("Peoples Handler", () => {
  beforeEach(() => {
    clearPeopleCache();
  });

  describe("listPeoplesHandler", () => {
    it("should return paginated peoples with metadata", async () => {
      const response = await listPeoplesHandler(1, 5);

      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.meta).toBeDefined();
      expect(response.meta?.total).toBeGreaterThan(0);
    });
  });

  describe("getPeopleHandler", () => {
    it("should return a people by PPL_ ID", async () => {
      const people = await getPeopleHandler("PPL_SHONA");

      expect(people).toBeDefined();
      expect(people?.id).toBe("PPL_SHONA");
    });

    it("should return null for non-existent people", async () => {
      const people = await getPeopleHandler("PPL_NONEXISTENT");

      expect(people).toBeNull();
    });
  });
});
