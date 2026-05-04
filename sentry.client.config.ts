/**
 * Sentry Client-Side Configuration
 *
 * EU Data Region: DSN must use ingest.de.sentry.io for EU data residency
 * SENTRY_AUTH_TOKEN: Required for build-step source-map uploads (set in CI/CD)
 * Retention: 30-day retention should be configured in Sentry dashboard settings
 */
import * as Sentry from "@sentry/nextjs";

import { beforeSend } from "@/lib/sentry/pii-scrubber";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // EU data residency
  // The DSN should point to EU: ingest.de.sentry.io

  // Enable performance monitoring (sample rate for production)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Debug mode for development
  debug: process.env.NODE_ENV === "development",

  // PII scrubbing via beforeSend hook
  beforeSend: beforeSend as Parameters<typeof Sentry.init>[0]["beforeSend"],

  // Enable deduplication (default behavior)
  integrations: [],

  // Only enable in production
  enabled:
    process.env.NODE_ENV === "production" ||
    !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
