import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { VoicesPanel } from "../VoicesPanel";

const PANEL_TEXT = {
  peopleId: "PPL_EWE",
  size: "md" as const,
  side: "left" as const,
  sourceLine: { label: "AFRIK — oral_narratives" },
  stepLabel: "07 · Voix",
  heading: "Ce que les récits racontent",
  body: "Des récits oraux transmis au sein de la communauté.",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VoicesPanel — oral narratives through the REQ-095 public renderer", () => {
  // @req REQ-095
  it("renders zero DOM output while narratives are absent (FR98)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })
    );

    const { container } = render(<VoicesPanel {...PANEL_TEXT} />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  // @req REQ-095
  it("renders zero DOM output when the narratives fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })
    );

    const { container } = render(<VoicesPanel {...PANEL_TEXT} />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  // @req REQ-095
  it("requests narratives scoped to the people id via the public endpoint", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })
    );

    render(<VoicesPanel {...PANEL_TEXT} />);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v2/oral-narratives?entityType=people&entityId=PPL_EWE"
    );
  });

  // @req REQ-095
  it("renders the FichePanel chapter anatomy and the shipped narrative renderer once narratives resolve", async () => {
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

    render(<VoicesPanel {...PANEL_TEXT} />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: "Ce que les récits racontent",
        })
      ).toBeInTheDocument();
    });
    expect(screen.getByText("07 · Voix")).toBeInTheDocument();
    expect(screen.getByText("AFRIK — oral_narratives")).toBeInTheDocument();

    // The shipped REQ-095 renderer (OralNarrativesSection) owns the actual
    // narrative markup and rights-filtered fields, untouched.
    await waitFor(() => {
      expect(screen.getByText("Voix & récits")).toBeInTheDocument();
    });
    expect(screen.getByText(/Récit attribué à M\. N\./)).toBeInTheDocument();
  });
});
