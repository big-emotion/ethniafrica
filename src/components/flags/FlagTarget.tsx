"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOptionalConsent } from "@/hooks/use-consent";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/lib/supabase/auth-client";
import { cn } from "@/lib/utils";
import {
  FlagForm,
  type FlagFormTarget,
  type FlagSubmissionPayload,
} from "@/components/flags/FlagForm";
import { TurnstileWidget } from "@/components/flags/TurnstileWidget";

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string> }
    ) => void;
  }
}

type GateResult =
  | { status: "checking" }
  | { status: "unauthenticated" }
  | { status: "unconfirmed" }
  | { status: "ready"; accessToken: string };

async function checkGate(): Promise<GateResult> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { status: "unauthenticated" };
  }

  const { data: profile } = await supabase
    .from("contributor_profiles")
    .select("age_confirmed_at")
    .or(`id.eq.${session.user.id},user_id.eq.${session.user.id}`)
    .maybeSingle();

  if (!profile?.age_confirmed_at) {
    return { status: "unconfirmed" };
  }

  return { status: "ready", accessToken: session.access_token };
}

function currentUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

export interface FlagTargetProps {
  target: FlagFormTarget;
  /**
   * Optional override. Left out — which is the normal case — the key is read
   * from the environment, because a Turnstile *site* key is public by
   * definition and threading it through four page components and a dozen
   * intermediate props bought nothing but the opportunity to forget one. That
   * is exactly what happened: every mount site guarded on this prop, and no
   * page ever supplied it, so every report button in the product was dead.
   */
  turnstileSiteKey?: string;
  triggerLabel?: string;
  className?: string;
}

/**
 * The key must be read as one full literal expression. Next.js inlines public
 * environment variables at build time by textual substitution, so a
 * destructured or computed lookup resolves to undefined in the browser.
 */
function configuredSiteKey(): string {
  return process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ?? "";
}

// @req REQ-012
export function FlagTarget({
  target,
  turnstileSiteKey,
  triggerLabel = "Signaler",
  className,
}: FlagTargetProps) {
  const siteKey = turnstileSiteKey?.trim() || configuredSiteKey().trim();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [gate, setGate] = useState<GateResult>({ status: "checking" });
  const { toast } = useToast();
  const consent = useOptionalConsent();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setGate({ status: "checking" });
      checkGate().then(setGate);
    }
  }

  async function handleSubmit(payload: FlagSubmissionPayload) {
    if (gate.status !== "ready") {
      throw new Error("Authentication required");
    }

    const response = await fetch("/api/v2/flags", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gate.accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await response.json();

    if (!response.ok) {
      throw new Error(json?.errors?.[0]?.message ?? "flag submission failed");
    }

    const publicSlug = json.data.public_slug as string;

    if (consent?.consentState.preferences.analytics) {
      window.plausible?.("flag_submitted", {
        props: { target_type: target.type },
      });
    }
    toast({ description: "signalement enregistré" });
    setOpen(false);

    return { public_slug: publicSlug };
  }

  const signInHref = `/fr/compte/connexion?redirect=${encodeURIComponent(currentUrl())}`;
  const signUpHref = `/fr/compte/inscription?redirect=${encodeURIComponent(currentUrl())}`;

  // Below every hook, so the hook order is stable across both branches.
  //
  // With no key the widget cannot mint a token and the API refuses the
  // submission, so a control here could only ever fail. It renders nothing
  // rather than the dashed "bientôt disponible" button that stood here: that
  // wording promised a feature in progress, when the truth is a value missing
  // from the deployment.
  if (!siteKey) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn("w-full", className)}
        onClick={() => handleOpenChange(true)}
      >
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent aria-labelledby={titleId} className="max-w-lg">
          <DialogHeader>
            <DialogTitle id={titleId}>Signaler un problème</DialogTitle>
            <DialogDescription className="sr-only">
              Formulaire de signalement pour cet élément.
            </DialogDescription>
          </DialogHeader>

          {gate.status === "checking" && (
            <p role="status" className="text-afh-small text-afh-fg-muted">
              Vérification de votre compte…
            </p>
          )}

          {gate.status === "unauthenticated" && (
            <div className="space-y-3 text-afh-small">
              <p>Vous devez être connecté pour signaler un problème.</p>
              <div className="flex flex-col gap-2 min-[480px]:flex-row">
                <a
                  className="underline underline-offset-2 text-afh-terracotta"
                  href={signInHref}
                >
                  Se connecter
                </a>
                <a
                  className="underline underline-offset-2 text-afh-terracotta"
                  href={signUpHref}
                >
                  Créer un compte
                </a>
              </div>
            </div>
          )}

          {gate.status === "unconfirmed" && (
            <div className="space-y-3 text-afh-small">
              <p>merci de confirmer votre âge pour contribuer</p>
              <a
                className="underline underline-offset-2 text-afh-terracotta"
                href="/fr/compte/profil"
              >
                Confirmer mon âge
              </a>
            </div>
          )}

          {gate.status === "ready" && (
            <FlagForm
              target={target}
              onSubmit={handleSubmit}
              onCancel={() => setOpen(false)}
              renderTurnstile={({ onVerify, onError }) => (
                <TurnstileWidget
                  siteKey={siteKey}
                  onTokenChange={(token) => {
                    if (token) onVerify(token);
                    else onError();
                  }}
                />
              )}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
