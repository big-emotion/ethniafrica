// @req REQ-057
// @req REQ-080
// @req REQ-091
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  assertEuDsn,
  scrubEmail,
  truncateIpToSlash24,
  beforeSend,
} from "../sentry/pii-scrubber";
import type { Event, Breadcrumb } from "@sentry/nextjs";

describe("pii-scrubber", () => {
  describe("assertEuDsn", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("should not throw when DSN is undefined", () => {
      expect(() => assertEuDsn(undefined)).not.toThrow();
    });

    it("should not throw for a valid EU DSN hostname", () => {
      expect(() =>
        assertEuDsn("https://o123456.ingest.de.sentry.io/456789")
      ).not.toThrow();
    });

    it("should warn (not throw) in non-production when DSN uses US hostname", () => {
      vi.stubEnv("NODE_ENV", "development");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(() =>
        assertEuDsn("https://o123456.ingest.sentry.io/456789")
      ).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("ingest.de.sentry.io")
      );
      warnSpy.mockRestore();
    });

    it("should throw in production when DSN uses US hostname", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(() =>
        assertEuDsn("https://o123456.ingest.sentry.io/456789")
      ).toThrow(/ingest\.de\.sentry\.io/);
    });

    it("should not throw for a malformed DSN (URL parse error)", () => {
      expect(() => assertEuDsn("not-a-url")).not.toThrow();
    });
  });

  describe("scrubEmail", () => {
    it("should replace email addresses with [EMAIL_REDACTED]", () => {
      expect(scrubEmail("test@example.com")).toBe("[EMAIL_REDACTED]");
    });

    it("should replace multiple emails in a string", () => {
      const input = "Contact user@test.com or admin@domain.org for help";
      const expected = "Contact [EMAIL_REDACTED] or [EMAIL_REDACTED] for help";
      expect(scrubEmail(input)).toBe(expected);
    });

    it("should handle strings without emails", () => {
      expect(scrubEmail("no email here")).toBe("no email here");
    });

    it("should handle empty strings", () => {
      expect(scrubEmail("")).toBe("");
    });

    it("should handle complex email patterns", () => {
      expect(scrubEmail("user.name+tag@sub.domain.co.uk")).toBe(
        "[EMAIL_REDACTED]"
      );
    });
  });

  describe("truncateIpToSlash24", () => {
    it("should truncate IPv4 to /24 by replacing last octet with 0", () => {
      expect(truncateIpToSlash24("192.168.1.123")).toBe("192.168.1.0");
    });

    it("should handle already truncated IPs", () => {
      expect(truncateIpToSlash24("10.0.0.0")).toBe("10.0.0.0");
    });

    it("should truncate IPv6 addresses", () => {
      // IPv6 truncation - remove last segment
      expect(truncateIpToSlash24("2001:db8:85a3::8a2e:370:7334")).toBe(
        "2001:db8:85a3::8a2e:370:0"
      );
    });

    it("should handle full IPv6 addresses", () => {
      expect(
        truncateIpToSlash24("2001:0db8:85a3:0000:0000:8a2e:0370:7334")
      ).toBe("2001:0db8:85a3:0000:0000:8a2e:0370:0");
    });

    it("should handle empty strings", () => {
      expect(truncateIpToSlash24("")).toBe("");
    });

    it("should handle invalid IP formats gracefully", () => {
      expect(truncateIpToSlash24("not-an-ip")).toBe("not-an-ip");
    });

    // A proxied request carries the whole chain in X-Forwarded-For. The
    // anchored pattern matched only a lone address, so a chain went to Sentry
    // untouched — the client's full address first in line.
    // @req REQ-057
    it("truncates every address of a forwarded-for chain", () => {
      expect(truncateIpToSlash24("203.0.113.42, 10.1.2.3")).toBe(
        "203.0.113.0, 10.1.2.0"
      );
    });

    // @req REQ-057
    it("truncates a chain mixing IPv4 and IPv6", () => {
      expect(truncateIpToSlash24("203.0.113.42, 2001:db8::8a2e:370:7334")).toBe(
        "203.0.113.0, 2001:db8::8a2e:370:0"
      );
    });
  });

  describe("beforeSend", () => {
    it("should return null for null event", () => {
      expect(beforeSend(null as unknown as Event)).toBeNull();
    });

    it("should handle undefined event gracefully", () => {
      expect(beforeSend(undefined as unknown as Event)).toBeNull();
    });

    it("should scrub emails from event message", () => {
      const event: Event = {
        message: "Error for user test@example.com",
      };

      const result = beforeSend(event);

      expect(result?.message).toBe("Error for user [EMAIL_REDACTED]");
    });

    it("should truncate IP addresses in user data", () => {
      const event: Event = {
        user: {
          ip_address: "192.168.1.123",
        },
      };

      const result = beforeSend(event);

      expect(result?.user?.ip_address).toBe("192.168.1.0");
    });

    it("should scrub emails from user email field", () => {
      const event: Event = {
        user: {
          email: "user@example.com",
        },
      };

      const result = beforeSend(event);

      expect(result?.user?.email).toBe("[EMAIL_REDACTED]");
    });

    it("should scrub request headers", () => {
      const event: Event = {
        request: {
          headers: {
            "x-forwarded-for": "192.168.1.100",
            "x-user-email": "admin@test.com",
          },
        },
      };

      const result = beforeSend(event);

      expect(result?.request?.headers?.["x-forwarded-for"]).toBe("192.168.1.0");
      expect(result?.request?.headers?.["x-user-email"]).toBe(
        "[EMAIL_REDACTED]"
      );
    });

    it("should scrub breadcrumb messages", () => {
      const event: Event = {
        breadcrumbs: [
          {
            message: "User logged in: user@domain.com",
            category: "auth",
          },
          {
            message: "Request from IP 10.0.0.55",
            category: "http",
          },
        ],
      };

      const result = beforeSend(event);

      expect(result?.breadcrumbs?.[0]?.message).toBe(
        "User logged in: [EMAIL_REDACTED]"
      );
      expect(result?.breadcrumbs?.[1]?.message).toBe(
        "Request from IP 10.0.0.0"
      );
    });

    // @req REQ-057
    it("redacts credential-bearing headers whatever their casing", () => {
      const event: Event = {
        request: {
          headers: {
            Authorization: "Bearer pub_live_secretkey",
            cookie: "sb-access-token=eyJhbGciOi",
            "Set-Cookie": "ethni-locale=fr; Path=/",
            accept: "application/json",
          },
        },
      };

      const headers = beforeSend(event)?.request?.headers;

      expect(headers?.Authorization).toBe("[REDACTED]");
      expect(headers?.cookie).toBe("[REDACTED]");
      expect(headers?.["Set-Cookie"]).toBe("[REDACTED]");
      expect(headers?.accept).toBe("application/json");
    });

    // @req REQ-057
    it("truncates a forwarded-for chain in the request headers", () => {
      const event: Event = {
        request: {
          headers: { "x-forwarded-for": "203.0.113.42, 10.1.2.3" },
        },
      };

      expect(beforeSend(event)?.request?.headers?.["x-forwarded-for"]).toBe(
        "203.0.113.0, 10.1.2.0"
      );
    });

    // Cookies carry session tokens, the body carries whatever a reader typed
    // into a report form, and the query string of the auth callback carries a
    // one-time sign-in code. None of it is needed to diagnose an error.
    // @req REQ-057
    it("redacts request cookies, body and query string", () => {
      const event: Event = {
        request: {
          url: "https://ethniafrica.com/api/auth/callback?code=one-time-code",
          cookies: { "sb-access-token": "eyJhbGciOi" },
          data: { email: "reader@example.org", message: "hello" },
          query_string: "code=one-time-code&redirect=/fr/admin",
        },
      };

      const request = beforeSend(event)?.request;
      const serialized = JSON.stringify(request);

      expect(serialized).not.toContain("eyJhbGciOi");
      expect(serialized).not.toContain("reader@example.org");
      expect(serialized).not.toContain("one-time-code");
      expect(request?.url).toBe("https://ethniafrica.com/api/auth/callback");
    });

    // @req REQ-057
    it("scrubs string values nested in extra and contexts", () => {
      const event: Event = {
        extra: {
          reporter: "reader@example.org",
          nested: { clientIp: "Seen from 198.51.100.77", count: 3 },
          list: ["mod@example.org"],
        },
        contexts: {
          submission: { contact: "someone@example.org" },
        },
      };

      const result = beforeSend(event);

      expect(result?.extra?.reporter).toBe("[EMAIL_REDACTED]");
      expect(result?.extra?.nested).toEqual({
        clientIp: "Seen from 198.51.100.0",
        count: 3,
      });
      expect(result?.extra?.list).toEqual(["[EMAIL_REDACTED]"]);
      expect(result?.contexts?.submission).toEqual({
        contact: "[EMAIL_REDACTED]",
      });
    });

    // @req REQ-057
    it("scrubs breadcrumb data", () => {
      const event: Event = {
        breadcrumbs: [
          {
            category: "fetch",
            data: {
              url: "/api/v2/flags?contact=reader@example.org",
              from: "198.51.100.77",
            },
          } as Breadcrumb,
        ],
      };

      const data = beforeSend(event)?.breadcrumbs?.[0]?.data;

      expect(data).toEqual({
        url: "/api/v2/flags?contact=[EMAIL_REDACTED]",
        from: "198.51.100.0",
      });
    });

    it("should handle breadcrumbs without messages", () => {
      const event: Event = {
        breadcrumbs: [
          {
            category: "navigation",
            data: { from: "/", to: "/about" },
          } as Breadcrumb,
        ],
      };

      const result = beforeSend(event);

      expect(result?.breadcrumbs?.[0]?.category).toBe("navigation");
    });

    it("should scrub emails from exception value strings", () => {
      const event: Event = {
        exception: {
          values: [
            {
              type: "Error",
              value: "user test@example.com failed login",
            },
          ],
        },
      };

      const result = beforeSend(event);

      expect(result?.exception?.values?.[0]?.value).toBe(
        "user [EMAIL_REDACTED] failed login"
      );
    });

    it("should truncate IPs in exception value strings", () => {
      const event: Event = {
        exception: {
          values: [
            {
              type: "Error",
              value: "Request from 192.168.1.55 was rejected",
            },
          ],
        },
      };

      const result = beforeSend(event);

      expect(result?.exception?.values?.[0]?.value).toBe(
        "Request from 192.168.1.0 was rejected"
      );
    });

    it("should scrub multiple exception values", () => {
      const event: Event = {
        exception: {
          values: [
            { type: "Error", value: "caused by: admin@corp.com" },
            { type: "TypeError", value: "no PII here" },
          ],
        },
      };

      const result = beforeSend(event);

      expect(result?.exception?.values?.[0]?.value).toBe(
        "caused by: [EMAIL_REDACTED]"
      );
      expect(result?.exception?.values?.[1]?.value).toBe("no PII here");
    });

    it("should handle events with no sensitive data", () => {
      const event: Event = {
        message: "Something went wrong",
        level: "error",
      };

      const result = beforeSend(event);

      expect(result?.message).toBe("Something went wrong");
      expect(result?.level).toBe("error");
    });

    it("should preserve event structure while scrubbing", () => {
      const event: Event = {
        event_id: "123",
        timestamp: 1234567890,
        message: "Error for test@test.com",
        level: "error",
        user: {
          id: "user-123",
          ip_address: "8.8.8.8",
          email: "user@test.com",
        },
      };

      const result = beforeSend(event);

      expect(result?.event_id).toBe("123");
      expect(result?.timestamp).toBe(1234567890);
      expect(result?.level).toBe("error");
      expect(result?.user?.id).toBe("user-123");
      expect(result?.user?.ip_address).toBe("8.8.8.0");
      expect(result?.user?.email).toBe("[EMAIL_REDACTED]");
      expect(result?.message).toBe("Error for [EMAIL_REDACTED]");
    });
  });
});
