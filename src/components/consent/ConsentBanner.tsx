'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useConsent } from '@/hooks/use-consent';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { ConsentPreferences } from '@/types/consent';

const BANNER_TITLE_ID = 'consent-banner-title';

export function ConsentBanner() {
  const { showBanner, acceptAll, rejectAll, updatePreferences, consentState } =
    useConsent();
  const [showCustomize, setShowCustomize] = useState(false);
  // Track local overrides for preferences - null means use consentState
  const [localAnalytics, setLocalAnalytics] = useState<boolean | null>(null);
  const [localFunctional, setLocalFunctional] = useState<boolean | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Derive preferences from consent state with local overrides
  const preferences: ConsentPreferences = useMemo(
    () => ({
      essential: true,
      analytics: localAnalytics ?? consentState.preferences.analytics,
      functional: localFunctional ?? consentState.preferences.functional,
    }),
    [localAnalytics, localFunctional, consentState.preferences.analytics, consentState.preferences.functional]
  );

  // Remember the element that had focus before the banner appeared so we can
  // restore it when the banner is dismissed (WCAG 2.1 success criterion 2.4.3).
  const triggerElementRef = useRef<Element | null>(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!showBanner || !bannerRef.current) return;

    // Capture the element that currently has focus so we can restore it later.
    triggerElementRef.current = document.activeElement;

    // Focus the first button when banner appears
    firstFocusableRef.current?.focus();

    const banner = bannerRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        rejectAll();
        // Restore focus to the element that was focused before the banner opened.
        if (
          triggerElementRef.current instanceof HTMLElement ||
          triggerElementRef.current instanceof SVGElement
        ) {
          triggerElementRef.current.focus();
        }
        return;
      }

      // Focus trap
      if (event.key === 'Tab' && bannerRef.current) {
        const focusableElements = bannerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Attach to the banner element so the listener fires on the same node the
    // test fires events on, and is automatically scoped to the dialog.
    banner.addEventListener('keydown', handleKeyDown);
    return () => banner.removeEventListener('keydown', handleKeyDown);
  }, [showBanner, rejectAll]);

  const handleSavePreferences = useCallback(() => {
    updatePreferences(preferences);
  }, [preferences, updatePreferences]);

  const handleToggleAnalytics = useCallback((checked: boolean) => {
    setLocalAnalytics(checked);
  }, []);

  const handleToggleFunctional = useCallback((checked: boolean) => {
    setLocalFunctional(checked);
  }, []);

  if (!showBanner) {
    return null;
  }

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-labelledby={BANNER_TITLE_ID}
      aria-modal="false"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-background border-t border-border shadow-lg',
        'p-4 md:p-6'
      )}
    >
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h2
              id={BANNER_TITLE_ID}
              className="text-lg font-semibold text-foreground"
            >
              Gestion des cookies
            </h2>
            <p className="text-sm text-muted-foreground">
              Nous utilisons des cookies pour améliorer votre expérience sur
              notre site. Les cookies essentiels sont nécessaires au
              fonctionnement du site. Les cookies analytiques et fonctionnels
              nous aident à améliorer nos services.
            </p>
            <Link
              href="/fr/confidentialite"
              className="text-sm text-primary underline-offset-4 hover:underline w-fit"
            >
              Politique de confidentialité
            </Link>
          </div>

          {/* Customize Panel */}
          {showCustomize && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 p-4">
              {/* Essential cookies */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor="essential-switch"
                    className="text-sm font-medium text-foreground"
                  >
                    Cookies essentiels
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Requis - Nécessaires au fonctionnement du site
                  </span>
                </div>
                <Switch
                  id="essential-switch"
                  aria-label="Cookies essentiels"
                  checked={true}
                  disabled
                />
              </div>

              {/* Analytics cookies */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor="analytics-switch"
                    className="text-sm font-medium text-foreground"
                  >
                    Cookies analytiques
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Plausible - Statistiques anonymes de visite
                  </span>
                </div>
                <Switch
                  id="analytics-switch"
                  aria-label="Cookies analytiques"
                  checked={preferences.analytics}
                  onCheckedChange={handleToggleAnalytics}
                />
              </div>

              {/* Functional cookies */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor="functional-switch"
                    className="text-sm font-medium text-foreground"
                  >
                    Cookies fonctionnels
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Sentry - Rapport d&apos;erreurs pour améliorer le site
                  </span>
                </div>
                <Switch
                  id="functional-switch"
                  aria-label="Cookies fonctionnels"
                  checked={preferences.functional}
                  onCheckedChange={handleToggleFunctional}
                />
              </div>

              {/* Save preferences button */}
              <Button
                variant="default"
                className="mt-2 w-full md:w-auto md:self-end"
                onClick={handleSavePreferences}
              >
                Enregistrer mes préférences
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              ref={firstFocusableRef}
              variant="default"
              onClick={acceptAll}
            >
              Accepter tout
            </Button>
            <Button variant="outline" onClick={rejectAll}>
              Refuser
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowCustomize(!showCustomize)}
            >
              Personnaliser
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
