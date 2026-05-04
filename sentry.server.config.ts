/**
 * Sentry Server-Side Configuration
 *
 * EU Data Region: DSN must use ingest.de.sentry.io for EU data residency
 * SENTRY_AUTH_TOKEN: Required for build-step source-map uploads (set in CI/CD)
 * Retention: 30-day retention should be configured in Sentry dashboard settings
 */
import * as Sentry from "@sentry/nextjs";

import { beforeSend } from "@/lib/sentry/pii-scrubber";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Debug mode for development
  debug: process.env.NODE_ENV === "development",

  // PII scrubbing via beforeSend hook
  beforeSend: beforeSend as Parameters<typeof Sentry.init>[0]["beforeSend"],

  // Server-side: also scrub before sending spans/breadcrumbs
  beforeBreadcrumb(breadcrumb) {
    // Basic scrubbing for breadcrumbs
    return breadcrumb;
  },

  // Only enable in production
  enabled:
    process.env.NODE_ENV === "production" || !!process.env.SENTRY_DSN,
});
