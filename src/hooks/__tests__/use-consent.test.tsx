import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { ConsentProvider, useConsent } from "../use-consent";
import { CONSENT_STORAGE_KEY } from "@/lib/consent";
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

function wrapper({ children }: { children: React.ReactNode }) {
  return <ConsentProvider>{children}</ConsentProvider>;
}

describe("useConsent hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initial state", () => {
    it("should show banner when no consent is stored", async () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      // Wait for useEffect to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.showBanner).toBe(true);
      expect(result.current.consentState.hasConsented).toBe(false);
    });

    it("should not show banner when valid consent exists", async () => {
      const existingConsent: ConsentState = {
        hasConsented: true,
        preferences: {
          essential: true,
          analytics: true,
          functional: true,
        },
        consentDate: new Date().toISOString(),
      };

      localStorageMock.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify(existingConsent)
      );

      const { result } = renderHook(() => useConsent(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.showBanner).toBe(false);
      expect(result.current.consentState.hasConsented).toBe(true);
    });
  });

  describe("acceptAll", () => {
    it("should set all preferences to true", async () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.acceptAll();
      });

      expect(result.current.consentState.hasConsented).toBe(true);
      expect(result.current.consentState.preferences.essential).toBe(true);
      expect(result.current.consentState.preferences.analytics).toBe(true);
      expect(result.current.consentState.preferences.functional).toBe(true);
      expect(result.current.showBanner).toBe(false);
    });

    it("should persist to localStorage", async () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.acceptAll();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        CONSENT_STORAGE_KEY,
        expect.stringContaining('"hasConsented":true')
      );
    });
  });

  describe("rejectAll", () => {
    it("should set analytics and functional to false", async () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.rejectAll();
      });

      expect(result.current.consentState.hasConsented).toBe(true);
      expect(result.current.consentState.preferences.essential).toBe(true);
      expect(result.current.consentState.preferences.analytics).toBe(false);
      expect(result.current.consentState.preferences.functional).toBe(false);
      expect(result.current.showBanner).toBe(false);
    });

    it("should keep essential as true", async () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.rejectAll();
      });

      expect(result.current.consentState.preferences.essential).toBe(true);
    });
  });

  describe("updatePreferences", () => {
    it("should update specific categories", async () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updatePreferences({
          essential: true,
          analytics: true,
          functional: false,
        });
      });

      expect(result.current.consentState.preferences.analytics).toBe(true);
      expect(result.current.consentState.preferences.functional).toBe(false);
      expect(result.current.consentState.hasConsented).toBe(true);
    });

    it("should always ensure essential is true", async () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updatePreferences({
          essential: false, // Try to set to false
          analytics: true,
          functional: true,
        });
      });

      // Essential should still be true
      expect(result.current.consentState.preferences.essential).toBe(true);
    });
  });

  describe("consent persistence", () => {
    it("should persist across renders", async () => {
      const { result, rerender } = renderHook(() => useConsent(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.acceptAll();
      });

      const consentDateBefore = result.current.consentState.consentDate;

      // Rerender
      rerender();

      expect(result.current.consentState.hasConsented).toBe(true);
      expect(result.current.consentState.preferences.analytics).toBe(true);
      expect(result.current.consentState.consentDate).toBe(consentDateBefore);
    });
  });

  describe("expired consent", () => {
    it("should show banner when consent is expired", async () => {
      // Create consent from 13 months ago
      const expiredDate = new Date();
      expiredDate.setMonth(expiredDate.getMonth() - 13);

      const expiredConsent: ConsentState = {
        hasConsented: true,
        preferences: {
          essential: true,
          analytics: true,
          functional: true,
        },
        consentDate: expiredDate.toISOString(),
      };

      localStorageMock.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify(expiredConsent)
      );

      const { result } = renderHook(() => useConsent(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.showBanner).toBe(true);
      expect(result.current.consentState.hasConsented).toBe(false);
    });
  });

  describe("useConsent outside provider", () => {
    it("should throw error when used outside ConsentProvider", () => {
      expect(() => {
        renderHook(() => useConsent());
      }).toThrow("useConsent must be used within a ConsentProvider");
    });
  });

  describe("setShowBanner", () => {
    it("should allow manual control of banner visibility", async () => {
      const { result } = renderHook(() => useConsent(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Initially showing
      expect(result.current.showBanner).toBe(true);

      act(() => {
        result.current.setShowBanner(false);
      });

      expect(result.current.showBanner).toBe(false);

      act(() => {
        result.current.setShowBanner(true);
      });

      expect(result.current.showBanner).toBe(true);
    });
  });
});
