import { fireEvent, render, screen, within } from "@testing-library/react";
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

vi.mock("@/hooks/use-consent", () => ({
  useConsent: () => ({
    consentState: {
      hasConsented: true,
      preferences: { essential: true, analytics: false, functional: true },
      consentDate: null,
    },
    acceptAll: vi.fn(),
    rejectAll: vi.fn(),
    updatePreferences: vi.fn(),
    showBanner: false,
    setShowBanner: vi.fn(),
  }),
}));

import { CountryRecordView } from "@/components/country/CountryRecordView";
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

    render(<CountryRecordView country={country} />);

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

  // @req REQ-012 (AC5)
  it("renders a disabled FlagTarget shell on the country Culture section by default", () => {
    const country: CountryDetail = {
      id: "SEN",
      nameFr: "Sénégal",
      nameCommonFr: "Sénégal",
      nameOfficial: "République du Sénégal",
      culture: { dominantReligions: "Islam, christianisme" },
    };

    render(<CountryRecordView country={country} />);

    const flagTarget = screen.getByTestId("section-flag-target-culture");
    expect(within(flagTarget).getByRole("button")).toBeDisabled();
  });

  // @req REQ-012 (AC5)
  it("wires the live fiche_section FlagTarget on the country Culture section when turnstileSiteKey is provided", () => {
    const country: CountryDetail = {
      id: "SEN",
      nameFr: "Sénégal",
      nameCommonFr: "Sénégal",
      nameOfficial: "République du Sénégal",
      culture: { dominantReligions: "Islam, christianisme" },
    };

    render(
      <CountryRecordView country={country} turnstileSiteKey="test-site-key" />
    );

    const flagTarget = screen.getByTestId("section-flag-target-culture");
    expect(
      within(flagTarget).getByRole("button", { name: "Signaler cette section" })
    ).toBeEnabled();
  });

  // @req REQ-012 (AC5)
  it("renders a disabled FlagTarget shell on the people Culture section by default", () => {
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
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Culture" }));

    const flagTarget = screen.getByTestId("section-flag-target-culture");
    expect(within(flagTarget).getByRole("button")).toBeDisabled();
  });

  // @req REQ-012 (AC5)
  it("wires the live fiche_section FlagTarget on the people Culture section when turnstileSiteKey is provided", () => {
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
        turnstileSiteKey="test-site-key"
      />
    );
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Culture" }));

    const flagTarget = screen.getByTestId("section-flag-target-culture");
    expect(
      within(flagTarget).getByRole("button", { name: "Signaler cette section" })
    ).toBeEnabled();
  });
});
