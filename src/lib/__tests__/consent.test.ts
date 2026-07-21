import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  DEFAULT_PREFERENCES,
  getStoredConsent,
  saveConsent,
  isConsentExpired,
  clearConsent,
} from "../consent";
import type { ConsentState } from "@/types/consent";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

describe("consent utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getStoredConsent", () => {
    it("should return null when no consent is stored", () => {
      const result = getStoredConsent();
      expect(result).toBeNull();
    });

    it("should return stored consent when present", () => {
      const mockConsent: ConsentState = {
        hasConsented: true,
        preferences: {
          essential: true,
          analytics: true,
          functional: false,
        },
        consentDate: "2024-01-15T10:00:00.000Z",
      };

      localStorageMock.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify(mockConsent)
      );

      const result = getStoredConsent();
      expect(result).toEqual(mockConsent);
    });

    it("should return null for invalid JSON", () => {
      localStorageMock.setItem(CONSENT_STORAGE_KEY, "invalid-json");

      const result = getStoredConsent();
      expect(result).toBeNull();
    });
  });

  describe("saveConsent", () => {
    it("should persist consent to localStorage", () => {
      const consentState: ConsentState = {
        hasConsented: true,
        preferences: {
          essential: true,
          analytics: true,
          functional: true,
        },
        consentDate: "2024-06-15T12:00:00.000Z",
      };

      saveConsent(consentState);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        CONSENT_STORAGE_KEY,
        JSON.stringify(consentState)
      );
    });
  });

  describe("isConsentExpired", () => {
    it("should return true for dates more than 12 months ago", () => {
      // 13 months ago
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 13);

      const result = isConsentExpired(oldDate.toISOString());
      expect(result).toBe(true);
    });

    it("should return false for recent dates", () => {
      // 1 month ago
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 1);

      const result = isConsentExpired(recentDate.toISOString());
      expect(result).toBe(false);
    });

    it("should return false for dates exactly 11 months ago", () => {
      const elevenMonthsAgo = new Date();
      elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);

      const result = isConsentExpired(elevenMonthsAgo.toISOString());
      expect(result).toBe(false);
    });

    it("should return true for dates exactly 13 months ago", () => {
      const thirteenMonthsAgo = new Date();
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

      const result = isConsentExpired(thirteenMonthsAgo.toISOString());
      expect(result).toBe(true);
    });
  });

  describe("clearConsent", () => {
    it("should remove consent from localStorage", () => {
      const consentState: ConsentState = {
        hasConsented: true,
        preferences: DEFAULT_PREFERENCES,
        consentDate: new Date().toISOString(),
      };

      localStorageMock.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify(consentState)
      );

      clearConsent();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        CONSENT_STORAGE_KEY
      );
    });
  });

  describe("DEFAULT_PREFERENCES", () => {
    it("should have essential as true", () => {
      expect(DEFAULT_PREFERENCES.essential).toBe(true);
    });

    it("should have analytics as false", () => {
      expect(DEFAULT_PREFERENCES.analytics).toBe(false);
    });

    it("should have functional as false", () => {
      expect(DEFAULT_PREFERENCES.functional).toBe(false);
    });
  });
});
