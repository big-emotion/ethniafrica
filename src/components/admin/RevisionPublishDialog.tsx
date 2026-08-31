"use client";

import { useId, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, LoaderCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type RevisionPublishResult =
  | {
      success: true;
      revisionId: string;
      version: number;
      liveUrl?: string | null;
      pinnedUrl?: string | null;
    }
  | {
      success: false;
      message: string;
    };

interface RevisionPublishDialogProps {
  draftId: string;
  onPublish: (
    draftId: string,
    reason: string
  ) => Promise<RevisionPublishResult>;
}

const MIN_REASON_LENGTH = 50;
const MAX_REASON_LENGTH = 500;

// @req REQ-016
export function RevisionPublishDialog({
  draftId,
  onPublish,
}: RevisionPublishDialogProps) {
  const confirmationId = useId();
  const confirmationHintId = useId();
  const reasonId = useId();
  const reasonHintId = useId();
  const reasonCountId = useId();
  const confirmationRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [published, setPublished] = useState<
    Extract<RevisionPublishResult, { success: true }> | undefined
  >();

  const trimmedReason = reason.trim();
  const reasonLength = trimmedReason.length;
  const confirmationIsValid = confirmation === "PUBLIER";
  const reasonIsValid =
    reasonLength >= MIN_REASON_LENGTH && reasonLength <= MAX_REASON_LENGTH;
  const canPublish = confirmationIsValid && reasonIsValid && !pending;

  function resetDialog() {
    setConfirmation("");
    setReason("");
    setFailed(false);
    setPublished(undefined);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (pending && !nextOpen) return;
    setOpen(nextOpen);
    if (!nextOpen) resetDialog();
  }

  async function handlePublish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPublish || submittingRef.current) return;

    submittingRef.current = true;
    setPending(true);
    setFailed(false);

    try {
      const result = await onPublish(draftId, trimmedReason);
      if (result.success) {
        setPublished(result);
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button">Publier</Button>
      </DialogTrigger>

      <DialogContent
        className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl gap-5 overflow-y-auto rounded-afh-xl p-4 min-[720px]:p-6"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          confirmationRef.current?.focus();
        }}
      >
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Publier cette révision ?</DialogTitle>
          <DialogDescription>
            Cette action met immédiatement la fiche à jour et crée une version
            publique immuable.
          </DialogDescription>
        </DialogHeader>

        {published ? (
          <div className="space-y-4">
            <Alert
              aria-live="polite"
              className="border-afh-flag-resolved/40 bg-afh-bg-warm"
              role="status"
            >
              <CheckCircle2
                aria-hidden="true"
                className="text-afh-flag-resolved"
              />
              <AlertDescription className="font-medium text-afh-text">
                Révision v{published.version} publiée — fiche mise à jour
              </AlertDescription>
            </Alert>

            {(published.liveUrl || published.pinnedUrl) && (
              <div
                className={
                  published.liveUrl && published.pinnedUrl
                    ? "grid gap-2 min-[430px]:grid-cols-2"
                    : "grid gap-2"
                }
              >
                {published.liveUrl && (
                  <Button asChild className="w-full" variant="outline">
                    <a href={published.liveUrl}>
                      Voir la fiche mise à jour
                      <ExternalLink aria-hidden="true" />
                    </a>
                  </Button>
                )}
                {published.pinnedUrl && (
                  <Button asChild className="w-full" variant="outline">
                    <a href={published.pinnedUrl}>
                      Voir la version v{published.version}
                      <ExternalLink aria-hidden="true" />
                    </a>
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <DialogClose asChild>
                <Button type="button">Fermer</Button>
              </DialogClose>
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handlePublish}>
            {failed && (
              <Alert variant="destructive">
                <AlertDescription className="font-medium">
                  publication échouée — brouillon conservé
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor={confirmationId}>Confirmation</Label>
              <Input
                aria-describedby={confirmationHintId}
                aria-invalid={confirmation.length > 0 && !confirmationIsValid}
                autoComplete="off"
                disabled={pending}
                id={confirmationId}
                onChange={(event) => setConfirmation(event.target.value)}
                ref={confirmationRef}
                spellCheck={false}
                value={confirmation}
              />
              <p
                className="text-afh-caption text-afh-fg-muted"
                id={confirmationHintId}
              >
                Saisissez exactement <strong>PUBLIER</strong>, en majuscules.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Label htmlFor={reasonId}>Raison de la publication</Label>
                <span
                  aria-live="polite"
                  className={
                    reason.length > 0 && !reasonIsValid
                      ? "text-afh-caption tabular-nums text-afh-flag-open"
                      : "text-afh-caption tabular-nums text-afh-fg-muted"
                  }
                  id={reasonCountId}
                >
                  {reasonLength} / {MAX_REASON_LENGTH} caractères
                </span>
              </div>
              <Textarea
                aria-describedby={`${reasonHintId} ${reasonCountId}`}
                aria-invalid={reason.length > 0 && !reasonIsValid}
                className="min-h-32 resize-y"
                disabled={pending}
                id={reasonId}
                onChange={(event) => setReason(event.target.value)}
                value={reason}
              />
              <p
                className="text-afh-caption text-afh-fg-muted"
                id={reasonHintId}
              >
                Entre {MIN_REASON_LENGTH} et {MAX_REASON_LENGTH} caractères,
                espaces de début et de fin exclus.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 min-[720px]:flex-row min-[720px]:justify-end">
              <DialogClose asChild>
                <Button disabled={pending} type="button" variant="outline">
                  Annuler
                </Button>
              </DialogClose>
              <Button disabled={!canPublish} type="submit">
                {pending && (
                  <LoaderCircle
                    aria-hidden="true"
                    className="animate-spin motion-reduce:animate-none"
                  />
                )}
                {pending ? "Publication…" : "Confirmer la publication"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
