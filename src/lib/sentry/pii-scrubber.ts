import type { Breadcrumb, Event } from "@sentry/nextjs";

/**
 * Asserts that the provided Sentry DSN uses the EU data-region ingestion
 * hostname (`ingest.de.sentry.io`), enforcing GDPR data-residency at
 * startup rather than relying solely on documentation.
 *
 * Throws in production; logs a warning in other environments so local dev
 * is not blocked when NEXT_PUBLIC_SENTRY_DSN is unset.
 */
// @req REQ-080
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

const REDACTED = "[REDACTED]";

// Compared lower-case: Sentry keeps whatever casing the runtime reported, and
// `Authorization` and `authorization` both reach this hook.
const CREDENTIAL_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
]);

// Past this depth a value is redacted rather than walked. Sentry normalises
// events to a shallow depth before this hook runs, so real payloads never get
// here; the bound only guarantees the walk terminates.
const MAX_SCRUB_DEPTH = 8;

// Email regex pattern - matches common email formats
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const IPV4_REGEX = /^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/;

// An IPv6 address, as opposed to anything else with colons in it: hex digits
// and colons only, and either compressed (`::`) or full (seven colons). A
// looser pattern would truncate clock times like `00:00:00` in a Date header.
const IPV6_REGEX = /^([0-9a-fA-F:]+):([0-9a-fA-F]{1,4})$/;
const isIpv6 = (token: string) =>
  IPV6_REGEX.test(token) &&
  (token.includes("::") || token.split(":").length === 8);

/**
 * Scrubs email addresses from a string by replacing them with [EMAIL_REDACTED]
 */
// @req REQ-080
export function scrubEmail(str: string): string {
  if (!str) return str;
  return str.replace(EMAIL_REGEX, "[EMAIL_REDACTED]");
}

function truncateSingleIp(token: string): string {
  const ipv4Match = token.match(IPV4_REGEX);
  if (ipv4Match) return `${ipv4Match[1]}.0`;
  if (isIpv6(token)) return token.replace(IPV6_REGEX, "$1:0");
  return token;
}

/**
 * Truncates an IPv4 address to /24 (replaces last octet with 0)
 * For IPv6, truncates the last segment to 0
 *
 * Works token by token, so an X-Forwarded-For chain is truncated hop by hop
 * with its separators left as they were. Anchoring the pattern to the whole
 * value used to leave a chain untouched — client address first.
 */
// @req REQ-080
export function truncateIpToSlash24(ip: string): string {
  if (!ip) return ip;
  return ip.replace(/[^,\s]+/g, truncateSingleIp);
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

function scrubDeep(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return scrubString(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_SCRUB_DEPTH) return REDACTED;
  if (Array.isArray(value)) {
    return value.map((item) => scrubDeep(item, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      scrubDeep(nested, depth + 1),
    ])
  );
}

function scrubHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => {
      if (typeof value !== "string") return [name, value];
      if (CREDENTIAL_HEADERS.has(name.toLowerCase())) return [name, REDACTED];
      return [name, truncateIpToSlash24(scrubString(value))];
    })
  );
}

/**
 * The request as far as diagnosis needs it: method, path, headers minus
 * credentials. Cookies carry session tokens, the body carries whatever a
 * reader typed into a report form, and the query string of the auth callback
 * carries a one-time sign-in code — so all three are redacted, and the URL
 * loses its query for the same reason.
 */
function scrubRequest(request: Event["request"]): Event["request"] {
  const scrubbed = { ...request };

  if (scrubbed.url) {
    scrubbed.url = scrubString(scrubbed.url.split(/[?#]/)[0]);
  }
  if (scrubbed.headers) {
    scrubbed.headers = scrubHeaders(scrubbed.headers);
  }
  if (scrubbed.cookies) {
    scrubbed.cookies = Object.fromEntries(
      Object.keys(scrubbed.cookies).map((name) => [name, REDACTED])
    );
  }
  if (scrubbed.data !== undefined) scrubbed.data = REDACTED;
  if (scrubbed.query_string !== undefined) scrubbed.query_string = REDACTED;

  return scrubbed;
}

function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const scrubbed = { ...breadcrumb };
  if (scrubbed.message) scrubbed.message = scrubString(scrubbed.message);
  if (scrubbed.data) {
    scrubbed.data = scrubDeep(scrubbed.data) as Breadcrumb["data"];
  }
  return scrubbed;
}

/**
 * Sentry beforeSend hook that scrubs PII from events
 * - Scrubs email addresses from messages, breadcrumbs, and user data
 * - Truncates IP addresses to /24
 * - Redacts credentials, cookies, bodies and query strings from the request
 * - Scrubs every string nested in `extra`, `contexts` and breadcrumb `data`
 */
// @req REQ-080
export function beforeSend(event: Event): Event | null {
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

  if (scrubbedEvent.request) {
    scrubbedEvent.request = scrubRequest(scrubbedEvent.request);
  }

  if (scrubbedEvent.extra) {
    scrubbedEvent.extra = scrubDeep(scrubbedEvent.extra) as Event["extra"];
  }

  if (scrubbedEvent.contexts) {
    scrubbedEvent.contexts = scrubDeep(
      scrubbedEvent.contexts
    ) as Event["contexts"];
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

  if (scrubbedEvent.breadcrumbs && Array.isArray(scrubbedEvent.breadcrumbs)) {
    scrubbedEvent.breadcrumbs = scrubbedEvent.breadcrumbs.map(scrubBreadcrumb);
  }

  return scrubbedEvent;
}
