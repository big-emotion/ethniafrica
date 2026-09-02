import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ContactPage from "../page";
import { CONTACT_EMAIL } from "@/lib/brand";
import { DID_YOU_KNOW_FACTS } from "@/lib/home/didYouKnowFacts";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

describe("the contact page", () => {
  // @req REQ-045
  it("names itself once, at the top of the outline", () => {
    render(<ContactPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Contactez-nous" })
    ).toBeInTheDocument();
  });

  // @req REQ-045
  it("carries the form the retired Typeform never rendered", () => {
    render(<ContactPage />);

    expect(
      screen.getByRole("button", { name: /Envoyer le message/ })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Objet/)).toBeInTheDocument();
  });

  // @req REQ-045
  it("offers the direct address beside the form", () => {
    render(<ContactPage />);

    expect(screen.getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute(
      "href",
      `mailto:${CONTACT_EMAIL}`
    );
  });

  /**
   * A second `h2` painted at a third size is the heading-against-heading
   * divergence the typography charter forbids, and the aside is where it
   * would creep in — a rubric label and a fact headline both want to be one.
   */
  // @req REQ-045
  it("keeps a single section heading, so no two headings disagree on rank", () => {
    render(<ContactPage />);

    const sectionHeadings = screen.getAllByRole("heading", { level: 2 });
    expect(sectionHeadings).toHaveLength(1);
    expect(sectionHeadings[0]).toHaveTextContent("Envoyer un message");
  });

  // @req REQ-113
  it("spends the left column on a fact the bank actually holds", () => {
    render(<ContactPage />);

    const band = screen.getByTestId("contact-did-you-know");
    expect(within(band).getByText("Saviez-vous que")).toBeInTheDocument();

    const headlines = DID_YOU_KNOW_FACTS.map((fact) => fact.headline);
    const rendered = headlines.filter((headline) =>
      band.textContent?.includes(headline)
    );
    expect(rendered).toHaveLength(1);
  });

  /**
   * The tier is what licenses quoting the bank outside a fiche at all.
   */
  // @req REQ-113
  it("states what backs the fact it shows", () => {
    render(<ContactPage />);

    const band = screen.getByTestId("contact-did-you-know");
    expect(band.textContent).toMatch(
      /Source (officielle|référencée|non vérifiée)/i
    );
  });
});
