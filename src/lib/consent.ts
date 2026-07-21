import type { ConsentPreferences, ConsentState } from "@/types/consent";

export const CONSENT_STORAGE_KEY = "ethni-consent";
export const CONSENT_EXPIRY_MONTHS = 12;

export const DEFAULT_PREFERENCES: ConsentPreferences = {
  essential: true,
  analytics: false,
  functional: false,
};

export function getStoredConsent(): ConsentState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as ConsentState;
  } catch {
    return null;
  }
}

export function saveConsent(state: ConsentState): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
}

export function isConsentExpired(consentDate: string): boolean {
  const consentTime = new Date(consentDate).getTime();
  const now = Date.now();
  const expiryMs = CONSENT_EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000; // ~12 months in ms

  return now - consentTime > expiryMs;
}

export function clearConsent(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(CONSENT_STORAGE_KEY);
}
