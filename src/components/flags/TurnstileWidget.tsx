"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import Link from "next/link";
import { useState } from "react";

interface TurnstileWidgetProps {
  siteKey: string;
  onTokenChange: (token: string | null) => void;
}

const FALLBACK_NOTICE =
  "pour soumettre un signalement, activez JavaScript et débloquez challenges.cloudflare.com";

// @req REQ-012
export function validateTurnstileToken(token: string | null | undefined) {
  return token ? null : "vérification anti-bot requise";
}

// @req REQ-012
export function TurnstileWidget({
  siteKey,
  onTokenChange,
}: TurnstileWidgetProps) {
  const [hasError, setHasError] = useState(false);

  const handleSuccess = (token: string) => {
    setHasError(false);
    onTokenChange(token);
  };

  const handleExpire = () => {
    onTokenChange(null);
  };

  const handleError = () => {
    setHasError(true);
    onTokenChange(null);
  };

  const fallback = (
    <p className="text-afh-small text-muted-foreground">
      <span>{FALLBACK_NOTICE}</span>{" "}
      <Link
        className="underline underline-offset-2"
        href="/api/v2/flags"
        prefetch={false}
      >
        Utiliser l’API de signalement
      </Link>
    </p>
  );

  return (
    <div className="w-full max-w-full space-y-2">
      <Turnstile
        siteKey={siteKey}
        options={{ appearance: "interaction-only" }}
        onSuccess={handleSuccess}
        onExpire={handleExpire}
        onError={handleError}
      />
      {hasError && fallback}
      <noscript>{fallback}</noscript>
    </div>
  );
}
