"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { ConsentPreferences, ConsentState } from "@/types/consent";
import {
  DEFAULT_PREFERENCES,
  getStoredConsent,
  saveConsent,
  isConsentExpired,
} from "@/lib/consent";

interface ConsentContextValue {
  consentState: ConsentState;
  acceptAll: () => void;
  rejectAll: () => void;
  updatePreferences: (preferences: ConsentPreferences) => void;
  showBanner: boolean;
  setShowBanner: (show: boolean) => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

const DEFAULT_STATE: ConsentState = {
  hasConsented: false,
  preferences: DEFAULT_PREFERENCES,
  consentDate: null,
};

function getInitialConsentState(): ConsentState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  const stored = getStoredConsent();
  if (!stored) {
    return DEFAULT_STATE;
  }

  // Check if consent has expired
  if (stored.consentDate && isConsentExpired(stored.consentDate)) {
    return DEFAULT_STATE;
  }

  return stored;
}

function getInitialShowBanner(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const stored = getStoredConsent();
  if (!stored) {
    return true;
  }

  // Check if consent has expired
  if (stored.consentDate && isConsentExpired(stored.consentDate)) {
    return true;
  }

  return false;
}

interface ConsentProviderProps {
  children: ReactNode;
}

export function ConsentProvider({ children }: ConsentProviderProps) {
  const [consentState, setConsentState] = useState<ConsentState>(DEFAULT_STATE);
  const [showBanner, setShowBanner] = useState(false);

  // Load consent from localStorage on mount (client-side only)
  useEffect(() => {
    const initialState = getInitialConsentState();
    const initialShowBanner = getInitialShowBanner();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsentState(initialState);
    setShowBanner(initialShowBanner);
  }, []);

  const persistConsent = useCallback((newState: ConsentState) => {
    setConsentState(newState);
    saveConsent(newState);
    setShowBanner(false);
  }, []);

  const acceptAll = useCallback(() => {
    const newState: ConsentState = {
      hasConsented: true,
      preferences: {
        essential: true,
        analytics: true,
        functional: true,
      },
      consentDate: new Date().toISOString(),
    };
    persistConsent(newState);
  }, [persistConsent]);

  const rejectAll = useCallback(() => {
    const newState: ConsentState = {
      hasConsented: true,
      preferences: {
        essential: true, // Essential is always true
        analytics: false,
        functional: false,
      },
      consentDate: new Date().toISOString(),
    };
    persistConsent(newState);
  }, [persistConsent]);

  const updatePreferences = useCallback(
    (preferences: ConsentPreferences) => {
      const newState: ConsentState = {
        hasConsented: true,
        preferences: {
          ...preferences,
          essential: true, // Always ensure essential is true
        },
        consentDate: new Date().toISOString(),
      };
      persistConsent(newState);
    },
    [persistConsent]
  );

  const value: ConsentContextValue = {
    consentState,
    acceptAll,
    rejectAll,
    updatePreferences,
    showBanner,
    setShowBanner,
  };

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);

  if (!context) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }

  return context;
}
