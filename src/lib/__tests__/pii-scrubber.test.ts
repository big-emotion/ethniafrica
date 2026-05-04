import { describe, it, expect } from "vitest";
import {
  scrubEmail,
  truncateIpToSlash24,
  beforeSend,
} from "../sentry/pii-scrubber";
import type { Event, Breadcrumb } from "@sentry/nextjs";

describe("pii-scrubber", () => {
  describe("scrubEmail", () => {
    it("should replace email addresses with [EMAIL_REDACTED]", () => {
      expect(scrubEmail("test@example.com")).toBe("[EMAIL_REDACTED]");
    });

    it("should replace multiple emails in a string", () => {
      const input = "Contact user@test.com or admin@domain.org for help";
      const expected =
        "Contact [EMAIL_REDACTED] or [EMAIL_REDACTED] for help";
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
