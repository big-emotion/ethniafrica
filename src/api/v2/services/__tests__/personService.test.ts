import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPersonById } from "../personService";
import type { Person } from "@/types/persons";

vi.mock("@/lib/supabase/queries/afrik/persons", () => ({
  getPersonById: vi.fn(),
}));

import { getPersonById as getPersonByIdQuery } from "@/lib/supabase/queries/afrik/persons";

describe("Person Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPersonById", () => {
    // @req REQ-137
    it("delegates to the query layer and returns the person", async () => {
      const mockPerson: Person = {
        id: "PER_DELAFOSSE",
        fullName: "Maurice Delafosse",
        roleCategory: "ethnographer",
        countryIds: ["MLI"],
        peopleLinks: [
          { peopleId: "PPL_BAMBARA", relationLabel: "observation" as const },
        ],
        sources: [],
      };
      vi.mocked(getPersonByIdQuery).mockResolvedValue(mockPerson);

      const person = await getPersonById("PER_DELAFOSSE");

      expect(getPersonByIdQuery).toHaveBeenCalledWith("PER_DELAFOSSE");
      expect(person).toEqual(mockPerson);
    });

    // @req REQ-137
    it("returns null for a non-existent person", async () => {
      vi.mocked(getPersonByIdQuery).mockResolvedValue(null);

      const person = await getPersonById("PER_UNKNOWN");

      expect(person).toBeNull();
    });
  });
});
