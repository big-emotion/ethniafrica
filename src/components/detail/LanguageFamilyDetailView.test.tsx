import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { LanguageFamilyDetailView } from "./LanguageFamilyDetailView";

vi.mock("@/lib/flags-client", () => ({
  hasActiveSourceFlag: vi.fn().mockResolvedValue(false),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LanguageFamilyDetailView", () => {
  // @req REQ-004
  it("should render canonical associated peoples returned by the API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "FLG_AFROASIATIQUE",
          nameFr: "Afro-asiatique",
          associatedPeoples: [
            { name: "Amhara", peopleId: "PPL_AMHARA" },
            { name: "Oromo", peopleId: "PPL_OROMO" },
          ],
          content: {
            generalInfo: {
              geographicArea: "Afrique du Nord et de l'Est",
            },
          },
        },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(
      <LanguageFamilyDetailView familyId="FLG_AFROASIATIQUE" language="fr" />
    );

    await waitFor(() => {
      expect(screen.getByText("2 peuples")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Peuples" }), {
      button: 0,
      ctrlKey: false,
    });

    expect(await screen.findByRole("link", { name: /Amhara/ })).toHaveAttribute(
      "href",
      "/fr/peuples/PPL_AMHARA"
    );
    expect(screen.getByRole("link", { name: /Oromo/ })).toHaveAttribute(
      "href",
      "/fr/peuples/PPL_OROMO"
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v2/language-families/FLG_AFROASIATIQUE"
    );
  });
});
