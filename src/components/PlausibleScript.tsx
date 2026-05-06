"use client";

import Script from "next/script";
import { buildPlausibleSrc } from "@/lib/plausible";
import { useConsent } from "@/hooks/use-consent";

/**
 * PlausibleScript — Client Component
 *
 * Injects the Plausible Analytics script only after the user has granted
 * analytics consent (AR26, AR37, NFR42).  No cookies are set; no user IDs
 * or fingerprints are collected.  DNT is respected automatically by
 * Plausible's own script.
 *
 * Uses strategy="lazyOnload" so Next.js defers injection until the browser
 * is idle — non-render-blocking by design.  The `defer` prop is omitted
 * because next/script manages its own injection timing and ignores it.
 *
 * Returns null (no DOM output) when analytics consent has not been granted
 * or when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is absent.
 */
export default function PlausibleScript() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const { consentState } = useConsent();

  if (!domain || !consentState.preferences.analytics) return null;

  const src = buildPlausibleSrc();

  return (
    <Script
      src={src}
      data-domain={domain}
      data-api="/api/event"
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}
