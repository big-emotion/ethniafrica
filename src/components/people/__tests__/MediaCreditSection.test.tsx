import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MediaCreditSection } from "../MediaCreditSection";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MediaCreditSection", () => {
  // @req REQ-128
  it("renders the author, licence and source page beside a media entry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "11111111-1111-1111-1111-111111111111",
              entityType: "people",
              entityId: "PPL_TEST",
              author: "A. N.",
              licenceUri: "https://creativecommons.org/licenses/by-sa/4.0/",
              sourcePageUrl: "https://example.org/photo",
              period: "20th century",
              depictionTiming: "contemporary",
            },
          ],
        }),
      })
    );

    render(<MediaCreditSection peopleId="PPL_TEST" />);

    await waitFor(() => {
      expect(screen.getByText("Crédits médias")).toBeInTheDocument();
    });
    expect(screen.getByText("A. N.")).toBeInTheDocument();
    const licenceLink = screen.getByRole("link", { name: /licence/i });
    expect(licenceLink).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by-sa/4.0/"
    );
    const sourceLink = screen.getByRole("link", { name: /source/i });
    expect(sourceLink).toHaveAttribute("href", "https://example.org/photo");
  });

  // @req REQ-128
  it("labels an entry with no known author instead of rendering a blank credit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "22222222-2222-2222-2222-222222222222",
              entityType: "people",
              entityId: "PPL_TEST",
              author: null,
              licenceUri: "https://creativecommons.org/licenses/by/4.0/",
              sourcePageUrl: null,
              period: null,
              depictionTiming: "reconstitution",
            },
          ],
        }),
      })
    );

    render(<MediaCreditSection peopleId="PPL_TEST" />);

    await waitFor(() => {
      expect(screen.getByText("Auteur inconnu")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("link", { name: /source/i })
    ).not.toBeInTheDocument();
  });

  // @req REQ-128
  it("stays absent when no media entry is available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })
    );

    const { container } = render(<MediaCreditSection peopleId="PPL_TEST" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
  });
});
