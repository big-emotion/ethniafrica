import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import * as Sentry from '@sentry/nextjs';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Next.js Script component — simplified to a plain <script> so we can query it
vi.mock('next/script', () => ({
  default: vi.fn(({ src, 'data-domain': dataDomain }: { src: string; 'data-domain'?: string }) => (
    <script data-testid="plausible-script" src={src} data-domain={dataDomain} />
  )),
}));

// @sentry/nextjs — spy on setUser
vi.mock('@sentry/nextjs', () => ({
  setUser: vi.fn(),
}));

// UI primitives
vi.mock('@/components/ui/toaster', () => ({ Toaster: () => null }));
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// react-query
vi.mock('@tanstack/react-query', () => ({
  QueryClient: class {
    constructor() {}
  },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ConsentBanner — not under test here
vi.mock('@/components/consent', () => ({ ConsentBanner: () => null }));

// ---------------------------------------------------------------------------
// Helpers to control the consent state returned by useConsent
// ---------------------------------------------------------------------------
type Preferences = { essential: boolean; analytics: boolean; functional: boolean };

const mockConsentState = { hasConsented: false, preferences: { essential: true, analytics: false, functional: false }, consentDate: null };
const mockUseConsent = vi.fn(() => ({
  consentState: mockConsentState,
  acceptAll: vi.fn(),
  rejectAll: vi.fn(),
  updatePreferences: vi.fn(),
  showBanner: false,
  setShowBanner: vi.fn(),
}));

vi.mock('@/hooks/use-consent', () => ({
  // ConsentProvider passes children straight through — state comes from mockUseConsent
  ConsentProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useConsent: () => mockUseConsent(),
}));

// ---------------------------------------------------------------------------
// Import providers AFTER all mocks are established
// ---------------------------------------------------------------------------
import { Providers } from '../providers';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConsentEnforcer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWithPreferences(preferences: Preferences) {
    mockUseConsent.mockReturnValue({
      consentState: { hasConsented: true, preferences, consentDate: new Date().toISOString() },
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

  it('does NOT render the Plausible script when analytics consent is false', () => {
    const { queryByTestId } = renderWithPreferences({ essential: true, analytics: false, functional: true });
    expect(queryByTestId('plausible-script')).toBeNull();
  });

  it('renders the Plausible script when analytics consent is true', () => {
    const { getByTestId } = renderWithPreferences({ essential: true, analytics: true, functional: true });
    expect(getByTestId('plausible-script')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Sentry
  // -------------------------------------------------------------------------

  it('calls Sentry.setUser(null) when functional consent is false', () => {
    renderWithPreferences({ essential: true, analytics: false, functional: false });
    expect(vi.mocked(Sentry.setUser)).toHaveBeenCalledWith(null);
  });

  it('does NOT call Sentry.setUser(null) when functional consent is true', () => {
    renderWithPreferences({ essential: true, analytics: false, functional: true });
    expect(vi.mocked(Sentry.setUser)).not.toHaveBeenCalled();
  });
});
