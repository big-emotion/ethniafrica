import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import * as Sentry from "@sentry/nextjs";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Next.js Script component — simplified to a plain <script> so we can query it
vi.mock("next/script", () => ({
  default: vi.fn(
    ({
      src,
      "data-domain": dataDomain,
    }: {
      src: string;
      "data-domain"?: string;
    }) => (
      <script
        data-testid="plausible-script"
        src={src}
        data-domain={dataDomain}
      />
    )
  ),
}));

// @sentry/nextjs — spy on setUser
vi.mock("@sentry/nextjs", () => ({
  setUser: vi.fn(),
}));

// UI primitives
vi.mock("@/components/ui/toaster", () => ({ Toaster: () => null }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// react-query
vi.mock("@tanstack/react-query", () => ({
  QueryClient: class {
    constructor() {}
  },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// ConsentBanner — not under test here
vi.mock("@/components/consent", () => ({ ConsentBanner: () => null }));

// next-themes — capture the props so the nonce contract can be asserted
const themeProviderProps = vi.fn();
vi.mock("next-themes", () => ({
  ThemeProvider: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
  } & Record<string, unknown>) => {
    themeProviderProps(props);
    return <>{children}</>;
  },
}));

// ---------------------------------------------------------------------------
// Helpers to control the consent state returned by useConsent
// ---------------------------------------------------------------------------
type Preferences = {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
};

const mockConsentState = {
  hasConsented: false,
  preferences: { essential: true, analytics: false, functional: false },
  consentDate: null,
};
const mockUseConsent = vi.fn(() => ({
  consentState: mockConsentState,
  acceptAll: vi.fn(),
  rejectAll: vi.fn(),
  updatePreferences: vi.fn(),
  showBanner: false,
  setShowBanner: vi.fn(),
}));

vi.mock("@/hooks/use-consent", () => ({
  // ConsentProvider passes children straight through — state comes from mockUseConsent
  ConsentProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useConsent: () => mockUseConsent(),
}));

// ---------------------------------------------------------------------------
// Import providers AFTER all mocks are established
// ---------------------------------------------------------------------------
import { Providers } from "../providers";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ConsentEnforcer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWithPreferences(preferences: Preferences) {
    mockUseConsent.mockReturnValue({
      consentState: {
        hasConsented: true,
        preferences,
        consentDate: new Date().toISOString(),
      },
      acceptAll: vi.fn(),
      rejectAll: vi.fn(),
      updatePreferences: vi.fn(),
      showBanner: false,
      setShowBanner: vi.fn(),
    });
    return render(<Providers>child</Providers>);
  }

  // -------------------------------------------------------------------------
  // Plausible
  // -------------------------------------------------------------------------

  it("does NOT render the Plausible script when analytics consent is false", () => {
    const { queryByTestId } = renderWithPreferences({
      essential: true,
      analytics: false,
      functional: true,
    });
    expect(queryByTestId("plausible-script")).toBeNull();
  });

  it("renders the Plausible script when analytics consent is true", () => {
    const { getByTestId } = renderWithPreferences({
      essential: true,
      analytics: true,
      functional: true,
    });
    expect(getByTestId("plausible-script")).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Sentry
  // -------------------------------------------------------------------------

  it("calls Sentry.setUser(null) when functional consent is false", () => {
    renderWithPreferences({
      essential: true,
      analytics: false,
      functional: false,
    });
    expect(vi.mocked(Sentry.setUser)).toHaveBeenCalledWith(null);
  });

  it("does NOT call Sentry.setUser(null) when functional consent is true", () => {
    renderWithPreferences({
      essential: true,
      analytics: false,
      functional: true,
    });
    expect(vi.mocked(Sentry.setUser)).not.toHaveBeenCalled();
  });
});

// The CSP allows scripts only from 'self' or carrying the request nonce, and
// next-themes writes an inline bootstrap script so the saved surface is
// applied before hydration. Without the nonce the browser drops that script:
// the reader's night choice silently reverts to parchment on every load.
describe("Providers — theme bootstrap under CSP (REQ-115)", () => {
  beforeEach(() => {
    themeProviderProps.mockClear();
  });

  // @req REQ-115
  it("hands the request nonce to the theme provider", () => {
    render(
      <Providers nonce="test-nonce-value">
        <div />
      </Providers>
    );

    expect(themeProviderProps).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: "test-nonce-value" })
    );
  });

  // Rendering without a nonce must not put the string "undefined" into the
  // script tag's nonce attribute, which would never match the header.
  // @req REQ-115
  it("omits the nonce attribute entirely when none was supplied", () => {
    render(
      <Providers>
        <div />
      </Providers>
    );

    const props = themeProviderProps.mock.calls[0][0];
    expect(props.nonce).toBeUndefined();
  });

  // enableSystem stays off: REQ-115 makes parchment the surface the editorial
  // copy was contrast-checked on, so night is opted into, not imposed by an OS
  // setting.
  // @req REQ-115
  it("keeps night an explicit choice rather than an OS inheritance", () => {
    render(
      <Providers>
        <div />
      </Providers>
    );

    expect(themeProviderProps).toHaveBeenCalledWith(
      expect.objectContaining({ defaultTheme: "light", enableSystem: false })
    );
  });
});
