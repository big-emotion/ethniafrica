import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OralNarrativesSection } from "../OralNarrativesSection";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OralNarrativesSection", () => {
  // @req REQ-095
  it("renders an attributed account as a narrative rather than a historical fact", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "11111111-1111-1111-1111-111111111111",
              narratorDisplayName: "M. N.",
              community: "Communauté test",
              languageCode: "fra",
              narrativeKind: "testimony",
              summary: "Un récit transmis au sein de la communauté.",
              variantOf: null,
            },
          ],
        }),
      })
    );

    render(<OralNarrativesSection peopleId="PPL_TEST" />);

    await waitFor(() => {
      expect(screen.getByText("Voix & récits")).toBeInTheDocument();
    });
    expect(screen.getByText(/Récit attribué à M\. N\./)).toBeInTheDocument();
    expect(
      screen.getByText("Un récit transmis au sein de la communauté.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Rôle historique")).not.toBeInTheDocument();
  });

  // @req REQ-095
  it("stays absent when no public narrative is available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })
    );

    const { container } = render(<OralNarrativesSection peopleId="PPL_TEST" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
  });
});
