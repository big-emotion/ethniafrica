/**
 * Sentry Client-Side Configuration
 *
 * EU Data Region: DSN must use ingest.de.sentry.io for EU data residency
 * SENTRY_AUTH_TOKEN: Required for build-step source-map uploads (set in CI/CD)
 * Retention: 30-day retention should be configured in Sentry dashboard settings
 */
import * as Sentry from "@sentry/nextjs";

import { assertEuDsn, beforeSend } from "@/lib/sentry/pii-scrubber";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Enforce EU data residency at startup (GDPR NFR34/AR28/AR38).
// Production builds will throw if the DSN does not target ingest.de.sentry.io.
assertEuDsn(dsn);

Sentry.init({
  dsn,

  // Enable performance monitoring (sample rate for production)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Debug mode for development
  debug: process.env.NODE_ENV === "development",

  // PII scrubbing via beforeSend hook
  beforeSend: beforeSend as Parameters<typeof Sentry.init>[0]["beforeSend"],

  // Only enable in production
  enabled:
    process.env.NODE_ENV === "production" ||
    !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
