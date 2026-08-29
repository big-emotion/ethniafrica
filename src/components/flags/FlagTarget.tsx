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
import { useConsent } from "@/hooks/use-consent";
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
  turnstileSiteKey: string;
  triggerLabel?: string;
  className?: string;
}

// @req REQ-012
export function FlagTarget({
  target,
  turnstileSiteKey,
  triggerLabel = "Signaler",
  className,
}: FlagTargetProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [gate, setGate] = useState<GateResult>({ status: "checking" });
  const { toast } = useToast();
  const { consentState } = useConsent();

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

    console.log(publicSlug);
    if (consentState.preferences.analytics) {
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
                  siteKey={turnstileSiteKey}
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
