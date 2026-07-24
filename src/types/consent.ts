export type ConsentCategory = "essential" | "analytics" | "functional";

export interface ConsentPreferences {
  essential: boolean; // Always true, required
  analytics: boolean; // Plausible, etc.
  functional: boolean; // Sentry user context, etc.
}

export interface ConsentState {
  hasConsented: boolean;
  preferences: ConsentPreferences;
  consentDate: string | null; // ISO date string
}
