import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompareShareBar } from "../CompareShareBar";

const CANONICAL_URL =
  "https://ethniafrica.example/fr/comparer/peoples/PPL_YORUBA/PPL_ASHANTI";
const FRENCH_TITLE = "Comparaison : Yoruba · Ashanti";

describe("CompareShareBar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // @req REQ-100
  it("calls navigator.share once with the canonical URL and French title when 'partager' is activated", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      share,
      clipboard: navigator.clipboard,
    });

    render(
      <CompareShareBar canonicalUrl={CANONICAL_URL} title={FRENCH_TITLE} />
    );

    await user.click(screen.getByRole("button", { name: /partager/i }));

    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({
      url: CANONICAL_URL,
      title: FRENCH_TITLE,
    });
  });

  // @req REQ-100
  it("does not render a native share button when navigator.share is undefined", () => {
    vi.stubGlobal("navigator", { ...navigator, share: undefined });

    render(
      <CompareShareBar canonicalUrl={CANONICAL_URL} title={FRENCH_TITLE} />
    );

    expect(
      screen.queryByRole("button", { name: /partager/i })
    ).not.toBeInTheDocument();
  });

  // @req REQ-100
  it("writes the canonical URL to the clipboard and announces 'copié' via aria-live=polite when 'copier le lien' is activated", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      share: undefined,
      clipboard: { writeText },
    });

    render(
      <CompareShareBar canonicalUrl={CANONICAL_URL} title={FRENCH_TITLE} />
    );

    await user.click(screen.getByRole("button", { name: /copier le lien/i }));

    expect(writeText).toHaveBeenCalledWith(CANONICAL_URL);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    await waitFor(() => expect(status).toHaveTextContent("copié"));
  });

  // @req REQ-100
  it("shows a selectable read-only URL field with 'sélectionner manuellement' when clipboard write rejects", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", {
      ...navigator,
      share: undefined,
      clipboard: { writeText },
    });

    render(
      <CompareShareBar canonicalUrl={CANONICAL_URL} title={FRENCH_TITLE} />
    );

    await user.click(screen.getByRole("button", { name: /copier le lien/i }));

    const field = await screen.findByRole("textbox", {
      name: /sélectionner manuellement/i,
    });
    expect(field).toHaveAttribute("readonly");
    expect(field).toHaveValue(CANONICAL_URL);
  });

  // @req REQ-100
  it("renders text-labelled buttons (no icon-only)", () => {
    vi.stubGlobal("navigator", { ...navigator, share: vi.fn() });

    render(
      <CompareShareBar canonicalUrl={CANONICAL_URL} title={FRENCH_TITLE} />
    );

    for (const button of screen.getAllByRole("button")) {
      expect(button.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });
});
