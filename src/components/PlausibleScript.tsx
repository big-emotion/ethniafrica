import Script from "next/script";
import { buildPlausibleSrc } from "@/lib/plausible";

/**
 * PlausibleScript — Server Component
 *
 * Injects the Plausible Analytics script when NEXT_PUBLIC_PLAUSIBLE_DOMAIN
 * is configured.  No cookies are set; no user IDs or fingerprints are
 * collected.  DNT is respected automatically by Plausible's own script.
 *
 * Returns null (no DOM output) when the env var is absent so the component
 * is safe to include unconditionally in the root layout.
 */
export default function PlausibleScript() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  const src = buildPlausibleSrc();

  return (
    <Script
      src={src}
      data-domain={domain}
      data-api="/api/event"
      defer
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
