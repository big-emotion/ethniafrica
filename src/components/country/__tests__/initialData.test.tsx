import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CountryDetail } from "@/types/afrik-frontend";

/**
 * The country fiche renders from what its route already awaited.
 *
 * This suite used to sit under `components/detail/` and cover two views at
 * once: the country dossier, and the legacy tabbed people view beside it. That
 * people view is gone — the atlas fiche replaced it and the peoples directory
 * no longer opens a pane — so the file moves next to the one view it still
 * describes rather than being deleted with the other. The people half of these
 * requirements now lives in `components/people/__tests__/`.
 */

const { mockGetCountry, mockHasActiveSourceFlag } = vi.hoisted(() => ({
  mockGetCountry: vi.fn(),
  mockHasActiveSourceFlag: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/afrikLoader", () => ({
  getCountry: (...args: unknown[]) => mockGetCountry(...args),
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

const senegal: CountryDetail = {
  id: "SEN",
  nameFr: "Sénégal",
  nameCommonFr: "Sénégal",
  nameOfficial: "République du Sénégal",
};

describe("the country dossier with server-provided data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasActiveSourceFlag.mockResolvedValue(false);
  });

  // @req REQ-046
  it("renders a country immediately without a duplicate client fetch", () => {
    render(<CountryRecordView country={senegal} />);

    // The h1 moved to the title band above the globe, so what proves the
    // record rendered from server data is the record itself — the claim this
    // test makes has always been about the absent fetch, not the heading.
    expect(screen.getByTestId("country-record-view")).toBeInTheDocument();
    expect(mockGetCountry).not.toHaveBeenCalled();
  });

  // @req REQ-012 (AC5)
  it("renders a disabled FlagTarget shell on the country Culture section by default", () => {
    render(
      <CountryRecordView
        country={{
          ...senegal,
          culture: { dominantReligions: "Islam, christianisme" },
        }}
      />
    );

    const flagTarget = screen.getByTestId("section-flag-target-culture");
    expect(within(flagTarget).getByRole("button")).toBeDisabled();
  });

  // @req REQ-012 (AC5)
  it("wires the live fiche_section FlagTarget on the country Culture section when turnstileSiteKey is provided", () => {
    render(
      <CountryRecordView
        country={{
          ...senegal,
          culture: { dominantReligions: "Islam, christianisme" },
        }}
        turnstileSiteKey="test-site-key"
      />
    );

    const flagTarget = screen.getByTestId("section-flag-target-culture");
    expect(
      within(flagTarget).getByRole("button", { name: "Signaler cette section" })
    ).toBeEnabled();
  });
});
