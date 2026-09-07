"use client";

import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { reportsCopy } from "@/lib/i18n/copy/reports";
import { FALLBACK_LOCALE } from "@/lib/locale";
import type { Language } from "@/types/shared";
import {
  FlagForm,
  type FlagFormTarget,
  type FlagSubmissionPayload,
} from "@/components/flags/FlagForm";
import { ProofOfWorkGate } from "@/components/flags/ProofOfWorkGate";
import { submitFlag } from "@/components/flags/submitFlag";
import { trackEvent } from "@/lib/analytics/trackEvent";

export interface FlagTargetProps {
  language?: Language;
  target: FlagFormTarget;
  triggerLabel?: string;
  className?: string;
  /**
   * Lets a surface supply its own trigger instead of the outlined button.
   *
   * Only for a control that has to join a row this component did not build.
   * The anecdote reader's reactions are three pills side by side; an outlined
   * button dropped among them reads as a fourth thing rather than the third
   * of three, and the reader loses the row. The actions charter's rule that a
   * button is never rebuilt by hand (§4) is about picking a new shape for a
   * lone control — not about matching a row that already exists.
   *
   * The default stays the primitive, and every new surface should take it.
   */
  renderTrigger?: (open: () => void) => ReactNode;
}

// @req REQ-012
export function FlagTarget({
  language = FALLBACK_LOCALE,
  target,
  triggerLabel,
  className,
  renderTrigger,
}: FlagTargetProps) {
  const copy = reportsCopy[language].dialog;
  const resolvedTriggerLabel = triggerLabel ?? copy.trigger;
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  function handleOpenChange(next: boolean) {
    // Opening is half the funnel. Without it a submission count cannot say
    // whether the dialog is rarely opened or routinely abandoned.
    if (next) trackEvent("report:open", { target_type: target.type });
    setOpen(next);
  }

  async function handleSubmit(payload: FlagSubmissionPayload) {
    const { public_slug: publicSlug } = await submitFlag(payload);

    trackEvent("report:submit", { target_type: target.type });
    toast({ description: copy.saved });
    setOpen(false);

    return { public_slug: publicSlug };
  }

  // No configuration gate any more. The proof of work needs no public key,
  // so the control has nothing left to be missing — and the prop that guarded
  // it, which no page ever supplied, is what kept every report button in the
  // product dead.

  return (
    <>
      {renderTrigger ? (
        renderTrigger(() => handleOpenChange(true))
      ) : (
        <Button
          type="button"
          variant="outline"
          className={cn("w-full", className)}
          onClick={() => handleOpenChange(true)}
        >
          {resolvedTriggerLabel}
        </Button>
      )}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent aria-labelledby={titleId} className="max-w-lg">
          <DialogHeader>
            <DialogTitle id={titleId}>{copy.title}</DialogTitle>
            <DialogDescription className="sr-only">
              {copy.description}
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
              <ProofOfWorkGate
                language={language}
                onSolved={onSolved}
                onFailed={onFailed}
              />
            )}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
