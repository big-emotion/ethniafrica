import type { Event, EventHint } from "@sentry/nextjs";

/**
 * Asserts that the provided Sentry DSN uses the EU data-region ingestion
 * hostname (`ingest.de.sentry.io`), enforcing GDPR data-residency at
 * startup rather than relying solely on documentation.
 *
 * Throws in production; logs a warning in other environments so local dev
 * is not blocked when NEXT_PUBLIC_SENTRY_DSN is unset.
 */
export function assertEuDsn(dsn: string | undefined): void {
  if (!dsn) return; // SDK will skip init when DSN is absent; nothing to validate
  try {
    const { hostname } = new URL(dsn);
    if (!hostname.endsWith("ingest.de.sentry.io")) {
      const message =
        `Sentry DSN hostname "${hostname}" does not use the EU data region ` +
        "(expected *.ingest.de.sentry.io). " +
        "Data may be routed to US infrastructure, violating GDPR NFR34/AR28/AR38.";
      if (process.env.NODE_ENV === "production") {
        throw new Error(message);
      } else {
        console.warn(`[sentry] ${message}`);
      }
    }
  } catch (err) {
    if (err instanceof TypeError) {
      // URL parse failure — DSN is malformed; let Sentry report that separately
      return;
    }
    throw err;
  }
}

// Email regex pattern - matches common email formats
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// IPv4 pattern
const IPV4_REGEX = /^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/;

// IPv6 pattern (simplified - matches addresses with colons)
const IPV6_REGEX = /^(.+):([0-9a-fA-F]+)$/;

/**
 * Scrubs email addresses from a string by replacing them with [EMAIL_REDACTED]
 */
export function scrubEmail(str: string): string {
  if (!str) return str;
  return str.replace(EMAIL_REGEX, "[EMAIL_REDACTED]");
}

/**
 * Truncates an IPv4 address to /24 (replaces last octet with 0)
 * For IPv6, truncates the last segment to 0
 */
export function truncateIpToSlash24(ip: string): string {
  if (!ip) return ip;

  // Try IPv4 first
  const ipv4Match = ip.match(IPV4_REGEX);
  if (ipv4Match) {
    return `${ipv4Match[1]}.0`;
  }

  // Try IPv6
  const ipv6Match = ip.match(IPV6_REGEX);
  if (ipv6Match) {
    return `${ipv6Match[1]}:0`;
  }

  // Return original if not a recognized IP format
  return ip;
}

/**
 * Scrubs a string for both emails and IPs
 */
function scrubString(str: string): string {
  if (!str) return str;

  // First scrub emails
  let result = scrubEmail(str);

  // Then look for IP addresses in the string and truncate them
  // This handles IPs embedded in messages
  result = result.replace(
    /\b(\d{1,3}\.\d{1,3}\.\d{1,3})\.(\d{1,3})\b/g,
    "$1.0"
  );

  return result;
}

/**
 * Sentry beforeSend hook that scrubs PII from events
 * - Scrubs email addresses from messages, breadcrumbs, and user data
 * - Truncates IP addresses to /24
 * - Scrubs request headers
 */
export function beforeSend(event: Event, hint?: EventHint): Event | null {
  if (!event) return null;

  // Clone the event to avoid mutating the original
  const scrubbedEvent: Event = { ...event };

  // Scrub message
  if (scrubbedEvent.message) {
    scrubbedEvent.message = scrubString(scrubbedEvent.message);
  }

  // Scrub user data
  if (scrubbedEvent.user) {
    scrubbedEvent.user = { ...scrubbedEvent.user };

    if (scrubbedEvent.user.ip_address) {
      scrubbedEvent.user.ip_address = truncateIpToSlash24(
        scrubbedEvent.user.ip_address
      );
    }

    if (scrubbedEvent.user.email) {
      scrubbedEvent.user.email = scrubEmail(scrubbedEvent.user.email);
    }
  }

  // Scrub request headers
  if (scrubbedEvent.request?.headers) {
    scrubbedEvent.request = { ...scrubbedEvent.request };
    scrubbedEvent.request.headers = { ...scrubbedEvent.request.headers };

    for (const [key, value] of Object.entries(scrubbedEvent.request.headers)) {
      if (typeof value === "string") {
        // Scrub emails first
        let scrubbedValue = scrubEmail(value);
        // Then truncate IPs
        scrubbedValue = truncateIpToSlash24(scrubbedValue);
        scrubbedEvent.request.headers[key] = scrubbedValue;
      }
    }
  }

  // Scrub exception values (error message strings)
  if (scrubbedEvent.exception?.values) {
    scrubbedEvent.exception = {
      ...scrubbedEvent.exception,
      values: scrubbedEvent.exception.values.map((exceptionValue) => {
        if (exceptionValue.value) {
          return {
            ...exceptionValue,
            value: scrubString(exceptionValue.value),
          };
        }
        return exceptionValue;
      }),
    };
  }

  // Scrub breadcrumbs
  if (scrubbedEvent.breadcrumbs && Array.isArray(scrubbedEvent.breadcrumbs)) {
    scrubbedEvent.breadcrumbs = scrubbedEvent.breadcrumbs.map((breadcrumb) => {
      if (breadcrumb.message) {
        return {
          ...breadcrumb,
          message: scrubString(breadcrumb.message),
        };
      }
      return breadcrumb;
    });
  }

  return scrubbedEvent;
}
