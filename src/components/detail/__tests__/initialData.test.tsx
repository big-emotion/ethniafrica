import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CountryDetail, PeopleDetail } from "@/types/afrik-frontend";

const { mockGetCountry, mockGetPeople, mockHasActiveSourceFlag } = vi.hoisted(
  () => ({
    mockGetCountry: vi.fn(),
    mockGetPeople: vi.fn(),
    mockHasActiveSourceFlag: vi.fn(),
  })
);

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/afrikLoader", () => ({
  getCountry: (...args: unknown[]) => mockGetCountry(...args),
  getPeople: (...args: unknown[]) => mockGetPeople(...args),
}));

vi.mock("@/lib/flags-client", () => ({
  hasActiveSourceFlag: (...args: unknown[]) => mockHasActiveSourceFlag(...args),
}));

import { CountryDetailViewV2 } from "../CountryDetailViewV2";
import { PeopleDetailView } from "../PeopleDetailView";

describe("detail views with server-provided data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasActiveSourceFlag.mockResolvedValue(false);
  });

  // @req REQ-046
  it("renders a country immediately without a duplicate client fetch", () => {
    const country: CountryDetail = {
      id: "SEN",
      nameFr: "Sénégal",
      nameCommonFr: "Sénégal",
      nameOfficial: "République du Sénégal",
    };

    render(
      <CountryDetailViewV2
        countryId="SEN"
        language="fr"
        initialData={country}
      />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Sénégal" })
    ).toBeInTheDocument();
    expect(mockGetCountry).not.toHaveBeenCalled();
  });

  // @req REQ-046
  it("renders a people immediately without a duplicate client fetch", () => {
    const people: PeopleDetail = {
      id: "PPL_WOLOF",
      nameMain: "Wolof",
      languageFamilyId: "FLG_NIGER_CONGO",
      currentCountries: ["SEN"],
    };

    render(
      <PeopleDetailView
        peopleId="PPL_WOLOF"
        language="fr"
        initialData={people}
      />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Wolof" })
    ).toBeInTheDocument();
    expect(mockGetPeople).not.toHaveBeenCalled();
  });
});
