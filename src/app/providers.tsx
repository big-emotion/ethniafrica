"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";
import Script from "next/script";
import * as Sentry from "@sentry/nextjs";
import { ConsentProvider, useConsent } from "@/hooks/use-consent";
import { ConsentBanner } from "@/components/consent";

/**
 * Enforces consent preferences on third-party integrations:
 * - Plausible: analytics script is only rendered when analytics consent is given.
 * - Sentry user context: cleared when functional consent is revoked.
 *
 * Must be rendered inside <ConsentProvider>.
 */
function ConsentEnforcer() {
  const { consentState } = useConsent();
  const { analytics, functional } = consentState.preferences;

  // Sentry user context: clear when functional consent is false or not yet given.
  useEffect(() => {
    if (!functional) {
      Sentry.setUser(null);
    }
  }, [functional]);

  // Plausible: only inject the script when analytics consent is true.
  if (!analytics) {
    return null;
  }

  return (
    <Script
      defer
      data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
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
            <ConsentBanner />
          </ConsentProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
