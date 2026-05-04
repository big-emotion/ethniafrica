// Sentry Edge Runtime Configuration
// EU Data Residency: Ensure your DSN uses ingest.de.sentry.io for GDPR compliance
// SENTRY_AUTH_TOKEN required for source-map uploads during build
// Configure 30-day retention in Sentry dashboard settings

import * as Sentry from "@sentry/nextjs";
import { assertEuDsn } from "@/lib/sentry/pii-scrubber";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// Enforce EU data residency at startup (GDPR NFR34/AR28/AR38).
// Production builds will throw if the DSN does not target ingest.de.sentry.io.
assertEuDsn(dsn);

Sentry.init({
  dsn,

  // Performance monitoring - lower sample rate for production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Debug mode for development
  debug: process.env.NODE_ENV === "development",

  // Only enable in production or when DSN is explicitly set
  enabled: process.env.NODE_ENV === "production" || !!process.env.SENTRY_DSN,
});
