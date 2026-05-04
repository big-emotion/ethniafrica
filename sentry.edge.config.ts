// Sentry Edge Runtime Configuration
// EU Data Residency: Ensure your DSN uses ingest.de.sentry.io for GDPR compliance
// SENTRY_AUTH_TOKEN required for source-map uploads during build
// Configure 30-day retention in Sentry dashboard settings

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring - lower sample rate for production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Debug mode for development
  debug: process.env.NODE_ENV === "development",

  // Only enable in production or when DSN is explicitly set
  enabled: process.env.NODE_ENV === "production" || !!process.env.SENTRY_DSN,
});
