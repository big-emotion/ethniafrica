import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ATTRIBUTION_STRING } from "@/lib/brand";
import * as consentModule from "@/hooks/use-consent";

vi.mock("@/hooks/use-consent", () => ({
  useConsent: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    className,
  }: {
    alt: string;
    src: string;
    width: number;
    height: number;
    className?: string;
  }) => <span role="img" aria-label={alt} className={className} />,
}));

describe("SiteFooter", () => {
  const setShowBanner = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(consentModule.useConsent).mockReturnValue({
      consentState: {
        hasConsented: true,
        preferences: {
          essential: true,
          analytics: false,
          functional: false,
        },
        consentDate: "2026-07-25T00:00:00.000Z",
      },
      acceptAll: vi.fn(),
      rejectAll: vi.fn(),
      updatePreferences: vi.fn(),
      showBanner: false,
      setShowBanner,
    });
  });

  // @req REQ-088
  it("presents BIG EMOTION as the linked creative partner", () => {
    render(<SiteFooter language="fr" />);

    const partnerLink = screen.getByRole("link", {
      name: "Fait avec émotion pour l'Afrique BIG EMOTION",
    });
    const partnerLogo = screen.getByRole("img", { name: "BIG EMOTION" });

    expect(partnerLink).toHaveAttribute("href", "https://big-emotion.com/");
    expect(partnerLink).toHaveAttribute("target", "_blank");
    expect(partnerLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText(ATTRIBUTION_STRING)).toBeInTheDocument();
    expect(partnerLogo).toHaveClass("w-16");
    expect(partnerLogo).not.toHaveClass("opacity-80");
  });

  // @req REQ-047
  // @req [16.3]
  it("uses the parchment footer surface without a separate brand panel", () => {
    render(<SiteFooter language="fr" />);

    const footer = screen.getByTestId("site-footer");
    const content = screen.getByTestId("footer-content");

    expect(footer).toHaveClass("bg-afh-bg-warm", "text-afh-text-soft");
    expect(footer).not.toHaveClass("bg-card", "bg-afh-earth");
    expect(content).toHaveClass("py-5", "xl:flex-row", "xl:flex-nowrap");
    expect(footer.innerHTML).not.toContain("64_100%_57%");
  });

  // @req REQ-088
  // @req [16.3]
  it("reads the attribution string from brand.ts, never a hardcoded literal", () => {
    render(<SiteFooter language="fr" />);

    expect(screen.getByText(ATTRIBUTION_STRING)).toBeInTheDocument();
    expect(
      screen.queryByText("Conçu avec émotion pour l’Afrique.")
    ).not.toBeInTheDocument();
  });

  // @req REQ-088
  it("links every required legal destination", () => {
    render(<SiteFooter language="fr" />);

    expect(
      screen.getByRole("link", { name: "Mentions légales" })
    ).toHaveAttribute("href", "/fr/mentions-legales");
    expect(
      screen.getByRole("link", { name: "Politique de données" })
    ).toHaveAttribute("href", "/fr/politique-de-donnees");
    expect(screen.getByRole("link", { name: "Accessibilité" })).toHaveAttribute(
      "href",
      "/fr/accessibilite"
    );
  });

  // @req REQ-088
  it("offers À propos as a footer destination", () => {
    render(<SiteFooter language="fr" />);

    expect(screen.getByRole("link", { name: "À propos" })).toHaveAttribute(
      "href",
      "/fr/about"
    );
  });

  // « À propos » is editorial, not legal — keeping it out of the legal landmark
  // is what lets that landmark's name stay accurate.
  // @req REQ-088
  it("keeps À propos outside the legal navigation landmark", () => {
    render(<SiteFooter language="fr" />);

    const legalNavigation = screen.getByRole("navigation", {
      name: "Informations légales",
    });

    expect(
      within(legalNavigation).queryByRole("link", { name: "À propos" })
    ).not.toBeInTheDocument();
  });

  // @req REQ-046
  it("reopens cookie preferences from the footer", () => {
    render(<SiteFooter language="fr" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Gestion des cookies" })
    );

    expect(setShowBanner).toHaveBeenCalledWith(true);
  });

  // @req REQ-087
  it("uses current EthniAfrica copyright copy without a data-source claim", () => {
    render(<SiteFooter language="fr" />);

    expect(
      screen.getByText(
        `© ${new Date().getFullYear()} EthniAfrica. Tous droits réservés.`
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Data sources/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Official demographic estimates/i)
    ).not.toBeInTheDocument();
  });
});
