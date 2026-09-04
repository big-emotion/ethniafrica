"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { ConsentProvider, useConsent } from "@/hooks/use-consent";
import { ConsentBanner } from "@/components/consent";
import { RouteTransitionLoader } from "@/components/system/RouteTransitionLoader";

/**
 * Enforces consent preferences on third-party integrations that have no
 * component of their own: Sentry user context is cleared when functional
 * consent is revoked. Plausible injection lives solely in
 * <PlausibleScript> (rendered in layout.tsx) — it used to be duplicated
 * here too, which fired the script twice and double-counted every pageview
 * whenever analytics consent was granted.
 *
 * Must be rendered inside <ConsentProvider>.
 */
function ConsentEnforcer() {
  const { consentState } = useConsent();
  const { functional } = consentState.preferences;

  // Sentry user context: clear when functional consent is false or not yet given.
  useEffect(() => {
    if (!functional) {
      Sentry.setUser(null);
    }
  }, [functional]);

  return null;
}

// @req REQ-115
export function Providers({
  children,
  nonce,
}: {
  children: React.ReactNode;
  /**
   * Request nonce minted by the CSP middleware. next-themes writes an inline
   * bootstrap script so the saved surface is applied before hydration, and
   * script-src admits no 'unsafe-inline' — without this the browser drops
   * that script and the reader's night choice reverts on every load.
   * Optional because the surfaces with no CSP (tests, Storybook) have none
   * to give.
   */
  nonce?: string;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    // `class` rather than a data attribute: Tailwind's darkMode is
    // configured as ["class"], so one switch drives both the shadcn HSL
    // layer (index.css .dark) and the --afh-* aliases (color.css .dark).
    // enableSystem stays off — REQ-115 makes parchment the surface the
    // editorial copy was contrast-checked on, so night is something the
    // reader opts into rather than something an OS setting imposes.
    <ThemeProvider
      nonce={nonce}
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ConsentProvider>
            <ConsentEnforcer />
            <Toaster />
            <Sonner />
            {children}
            {/* Mounted once for the whole site: it is the only wait state
                that reaches the routes a loading.tsx would soft-404, and the
                home, which can have no boundary of its own at all. */}
            <RouteTransitionLoader />
            <ConsentBanner />
          </ConsentProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
