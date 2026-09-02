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

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/use-consent", () => ({
  useOptionalConsent: () => null,
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
  });

  // @req REQ-046
  it("renders a country immediately without a duplicate client fetch", () => {
    render(<CountryRecordView country={senegal} />);

    // The h1 moved to the title band above the globe (CountryFicheTitle), so
    // what proves the record rendered from the server's data is the record
    // itself.
    expect(screen.getByTestId("country-record-view")).toBeInTheDocument();

    // The "no duplicate fetch" half of this used to be a `getCountry` spy on
    // afrikLoader. The view stopped importing that module, so the spy could
    // never be called and the assertion passed on a technicality — the shape
    // of a green gate that checks nothing. What the view owes is that it
    // renders from the server's data, which is what is asserted above.
  });

  /**
   * This assertion used to read "renders a disabled FlagTarget shell by
   * default", and it passed because the feature was dead in every deployment:
   * the control was guarded on a key no page supplied. The suite was green
   * because the button was.
   *
   * There is no key to guard on any more — the proof of work needs none — so
   * the pair of tests that stood here, one for each side of that condition,
   * collapses into this one.
   */
  // @req REQ-012 (AC5)
  it("renders a live report control on the country Culture section", () => {
    render(
      <CountryRecordView
        country={{
          ...senegal,
          culture: { dominantReligions: "Islam, christianisme" },
        }}
      />
    );

    const flagTarget = screen.getByTestId("section-flag-target-culture");
    expect(
      within(flagTarget).getByRole("button", { name: "Signaler cette section" })
    ).toBeEnabled();
  });
});
