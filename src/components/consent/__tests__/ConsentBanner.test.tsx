// @req REQ-046
// @req REQ-088
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsentBanner } from "../ConsentBanner";
import * as useConsentModule from "@/hooks/use-consent";
import { DEFAULT_LOCALE } from "@/lib/locale";
import { getStaticPageRoute } from "@/lib/routing";

// Mock the useConsent hook
vi.mock("@/hooks/use-consent", () => ({
  useConsent: vi.fn(),
}));

// The banner is mounted above the `[lang]` segment, so it reads the locale
// off the route params rather than off a prop. Mutable so a case can put the
// banner on an English page or outside the locale tree.
const routeParams = vi.hoisted(() => ({ current: { lang: "fr" } as object }));

vi.mock("next/navigation", () => ({
  useParams: () => routeParams.current,
}));

// Mock ResizeObserver for any UI components that need it
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

describe("ConsentBanner", () => {
  const mockAcceptAll = vi.fn();
  const mockRejectAll = vi.fn();
  const mockUpdatePreferences = vi.fn();
  const mockSetShowBanner = vi.fn();

  const defaultMockContext = {
    consentState: {
      hasConsented: false,
      preferences: { essential: true, analytics: false, functional: false },
      consentDate: null,
    },
    acceptAll: mockAcceptAll,
    rejectAll: mockRejectAll,
    updatePreferences: mockUpdatePreferences,
    showBanner: true,
    setShowBanner: mockSetShowBanner,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useConsentModule.useConsent).mockReturnValue(defaultMockContext);
    routeParams.current = { lang: "fr" };
  });

  it("renders when showBanner is true", () => {
    render(<ConsentBanner />);

    expect(screen.getByText("Gestion des cookies")).toBeInTheDocument();
  });

  it("does not render when showBanner is false", () => {
    vi.mocked(useConsentModule.useConsent).mockReturnValue({
      ...defaultMockContext,
      showBanner: false,
    });

    render(<ConsentBanner />);

    expect(screen.queryByText("Gestion des cookies")).not.toBeInTheDocument();
  });

  it('has role="dialog"', () => {
    render(<ConsentBanner />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
  });

  it("has aria-labelledby attribute pointing to banner title", () => {
    render(<ConsentBanner />);

    const dialog = screen.getByRole("dialog");
    const titleId = dialog.getAttribute("aria-labelledby");
    expect(titleId).toBeTruthy();

    const title = document.getElementById(titleId!);
    expect(title).toBeInTheDocument();
    expect(title?.textContent).toBe("Gestion des cookies");
  });

  it('calls acceptAll when "Accepter tout" button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConsentBanner />);

    const acceptButton = screen.getByRole("button", { name: /accepter tout/i });
    await user.click(acceptButton);

    expect(mockAcceptAll).toHaveBeenCalledTimes(1);
  });

  it('calls rejectAll when "Refuser" button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConsentBanner />);

    const rejectButton = screen.getByRole("button", { name: /refuser/i });
    await user.click(rejectButton);

    expect(mockRejectAll).toHaveBeenCalledTimes(1);
  });

  it('shows options panel when "Personnaliser" button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConsentBanner />);

    // Initially, the customization panel should not be visible
    expect(screen.queryByText("Cookies essentiels")).not.toBeInTheDocument();

    const customizeButton = screen.getByRole("button", {
      name: /personnaliser/i,
    });
    await user.click(customizeButton);

    // After clicking, the customization panel should be visible
    expect(screen.getByText("Cookies essentiels")).toBeInTheDocument();
    expect(screen.getByText("Cookies analytiques")).toBeInTheDocument();
    expect(screen.getByText("Cookies fonctionnels")).toBeInTheDocument();
  });

  it("essential toggle is disabled", async () => {
    const user = userEvent.setup();
    render(<ConsentBanner />);

    // Open customization panel
    const customizeButton = screen.getByRole("button", {
      name: /personnaliser/i,
    });
    await user.click(customizeButton);

    // Essential switch should be disabled
    const essentialSwitch = screen.getByRole("switch", {
      name: /cookies essentiels/i,
    });
    expect(essentialSwitch).toBeDisabled();
  });

  it("calls rejectAll when Escape key is pressed", async () => {
    render(<ConsentBanner />);

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });

    expect(mockRejectAll).toHaveBeenCalledTimes(1);
  });

  it("allows keyboard navigation through interactive elements", async () => {
    const user = userEvent.setup();
    render(<ConsentBanner />);

    // Start tabbing through elements
    await user.tab();

    // Check that focus moves to interactive elements
    const acceptButton = screen.getByRole("button", { name: /accepter tout/i });
    const rejectButton = screen.getByRole("button", { name: /refuser/i });
    const customizeButton = screen.getByRole("button", {
      name: /personnaliser/i,
    });
    const privacyLink = screen.getByRole("link", {
      name: /politique de données/i,
    });

    // Verify all interactive elements are focusable (exist and are not disabled)
    expect(acceptButton).not.toBeDisabled();
    expect(rejectButton).not.toBeDisabled();
    expect(customizeButton).not.toBeDisabled();
    expect(privacyLink).toHaveAttribute(
      "href",
      getStaticPageRoute("fr", "dataPolicy")
    );
  });

  // The banner used to point at `/fr/confidentialite`, one of two hand-written
  // privacy pages that restated the canonical one. Those are gone; the link
  // names the page the footer and the site tree already name.
  it("has a link to the privacy policy", () => {
    render(<ConsentBanner />);

    const privacyLink = screen.getByRole("link", {
      name: /politique de données/i,
    });
    expect(privacyLink).toHaveAttribute(
      "href",
      getStaticPageRoute("fr", "dataPolicy")
    );
  });

  // A global banner that always sent the reader to the French policy would
  // cross locales from every English page.
  // @req REQ-141
  it("links the policy in the locale of the page it is shown on", () => {
    routeParams.current = { lang: "en" };
    render(<ConsentBanner />);

    expect(
      screen.getByRole("link", { name: /politique de données/i })
    ).toHaveAttribute("href", getStaticPageRoute("en", "dataPolicy"));
  });

  // @req REQ-140
  it("falls back to the default locale outside the locale tree", () => {
    routeParams.current = {};
    render(<ConsentBanner />);

    expect(
      screen.getByRole("link", { name: /politique de données/i })
    ).toHaveAttribute("href", getStaticPageRoute(DEFAULT_LOCALE, "dataPolicy"));
  });

  it("saves custom preferences when save button is clicked", async () => {
    const user = userEvent.setup();
    render(<ConsentBanner />);

    // Open customization panel
    const customizeButton = screen.getByRole("button", {
      name: /personnaliser/i,
    });
    await user.click(customizeButton);

    // Toggle analytics
    const analyticsSwitch = screen.getByRole("switch", {
      name: /cookies analytiques/i,
    });
    await user.click(analyticsSwitch);

    // Save preferences
    const saveButton = screen.getByRole("button", {
      name: /enregistrer mes préférences/i,
    });
    await user.click(saveButton);

    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      essential: true,
      analytics: true,
      functional: false,
    });
  });
});
