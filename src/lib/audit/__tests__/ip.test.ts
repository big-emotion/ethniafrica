import { describe, it, expect } from "vitest";
import { truncateIp } from "../ip";

/**
 * IP truncation tests — privacy-preserving truncation for audit logs.
 *   IPv4 → /24 (zero out last octet)
 *   IPv6 → /48 (keep first 3 segments, zero out the rest)
 *   null / undefined / invalid → null
 */
describe("truncateIp", () => {
  describe("IPv4", () => {
    it("zeros out the last octet", () => {
      expect(truncateIp("192.168.1.42")).toBe("192.168.1.0");
    });

    it("handles all-zero host portion", () => {
      expect(truncateIp("10.0.0.0")).toBe("10.0.0.0");
    });

    it("handles boundary values", () => {
      expect(truncateIp("255.255.255.255")).toBe("255.255.255.0");
      expect(truncateIp("1.2.3.4")).toBe("1.2.3.0");
    });

    it("rejects malformed IPv4", () => {
      expect(truncateIp("999.999.999.999")).toBeNull();
      expect(truncateIp("1.2.3")).toBeNull();
      expect(truncateIp("1.2.3.4.5")).toBeNull();
      expect(truncateIp("foo.bar.baz.qux")).toBeNull();
    });
  });

  describe("IPv6", () => {
    it("truncates a full-form address to /48", () => {
      expect(truncateIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(
        "2001:db8:85a3::"
      );
    });

    it("handles abbreviated form", () => {
      expect(truncateIp("2001:db8:85a3::8a2e:370:7334")).toBe(
        "2001:db8:85a3::"
      );
    });

    it("handles loopback", () => {
      expect(truncateIp("::1")).toBe("0:0:0::");
    });

    it("rejects malformed IPv6", () => {
      expect(truncateIp("not:an:ip")).toBeNull();
      expect(truncateIp("2001:db8")).toBeNull();
    });
  });

  describe("nullish and invalid", () => {
    it("returns null for null", () => {
      expect(truncateIp(null)).toBeNull();
    });

    it("returns null for undefined", () => {
      expect(truncateIp(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(truncateIp("")).toBeNull();
    });

    it("returns null for non-IP strings", () => {
      expect(truncateIp("hello world")).toBeNull();
    });
  });
});
