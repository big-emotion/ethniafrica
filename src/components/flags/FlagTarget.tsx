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
import { ProofOfWorkGate } from "@/components/flags/ProofOfWorkGate";

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string> }
    ) => void;
  }
}

/**
 * The session, when there is one, for attribution only.
 *
 * This used to be a gate: no session, or an account whose age was not
 * confirmed, and the dialog offered links instead of a form. Reporting now
 * costs no account (moderation charter §2), so the token is passed when it
 * exists and omitted when it does not — the API decides what to credit, and
 * accepts either way.
 */
async function currentAccessToken(): Promise<string | null> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export interface FlagTargetProps {
  target: FlagFormTarget;
  triggerLabel?: string;
  className?: string;
}

// @req REQ-012
export function FlagTarget({
  target,
  triggerLabel = "Signaler",
  className,
}: FlagTargetProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const consent = useOptionalConsent();

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  async function handleSubmit(payload: FlagSubmissionPayload) {
    const accessToken = await currentAccessToken();

    const response = await fetch("/api/v2/flags", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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

  // No configuration gate any more. The proof of work needs no public key,
  // so the control has nothing left to be missing — and the prop that guarded
  // it, which no page ever supplied, is what kept every report button in the
  // product dead.

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

          {/* No gate stands here any more. The dialog used to open on an
              account check, then on an age check, and the form only appeared
              to a reader who had cleared both — through a sign-up flow that
              left the page, and an age confirmation that no screen could
              actually grant. The form is the first thing now. */}

          <FlagForm
            target={target}
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
            renderVerification={({ onSolved, onFailed }) => (
              <ProofOfWorkGate onSolved={onSolved} onFailed={onFailed} />
            )}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
