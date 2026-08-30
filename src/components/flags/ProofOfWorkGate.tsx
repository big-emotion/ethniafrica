"use client";

import { useEffect, useRef, useState } from "react";

import type { Challenge, Proof } from "@/lib/antibot/proofOfWork";

export interface ProofOfWorkGateProps {
  /** Called with the solved challenge, ready to travel in the payload. */
  onSolved: (proof: Proof) => void;
  /** Called when no proof can be produced, so the form can say so. */
  onFailed: () => void;
}

type Phase = "working" | "solved" | "failed";

const MESSAGES: Record<Phase, string> = {
  working: "Vérification en cours…",
  solved: "Vérification terminée.",
  failed:
    "La vérification n'a pas abouti. Rechargez la page pour réessayer, ou écrivez-nous.",
};

/**
 * The anti-bot control, seen by the reader.
 *
 * It asks nothing — no puzzle, no image, no checkbox. It fetches a challenge,
 * hands it to a worker, and reports when the browser has paid the cost. For
 * someone using a screen reader this is strictly better than the widget it
 * replaces: one polite status message instead of an embedded third-party
 * iframe with its own focus behaviour.
 *
 * It replaces `TurnstileWidget`. That component loaded a script from
 * `challenges.cloudflare.com` and sent the reader's IP there; this one talks
 * only to this service.
 *
 * JavaScript remains required, as it was with Turnstile — whose own fallback
 * text said "activez JavaScript". Not a regression, but still worth stating on
 * the page rather than leaving a reader with a form that never completes.
 */
// @req REQ-012
export function ProofOfWorkGate({ onSolved, onFailed }: ProofOfWorkGateProps) {
  const [phase, setPhase] = useState<Phase>("working");

  // The callbacks are read through a ref so a parent that re-creates them on
  // every render cannot restart the search — a solve is expensive, and running
  // it twice would double what the reader's device pays.
  const handlers = useRef({ onSolved, onFailed });
  handlers.current = { onSolved, onFailed };

  useEffect(() => {
    let abandoned = false;
    let worker: Worker | null = null;

    async function run() {
      try {
        const response = await fetch("/api/v2/antibot/challenge");
        if (!response.ok) throw new Error("challenge unavailable");
        const { data } = (await response.json()) as { data: Challenge };

        if (abandoned) return;

        worker = new Worker(
          new URL("../../workers/proofOfWork.worker.ts", import.meta.url)
        );

        worker.onmessage = (event: MessageEvent<{ nonce?: string }>) => {
          if (abandoned) return;

          const nonce = event.data?.nonce;
          if (!nonce) {
            setPhase("failed");
            handlers.current.onFailed();
            return;
          }

          setPhase("solved");
          handlers.current.onSolved({ ...data, nonce });
        };

        worker.onerror = () => {
          if (abandoned) return;
          setPhase("failed");
          handlers.current.onFailed();
        };

        worker.postMessage({
          salt: data.salt,
          difficultyBits: data.difficultyBits,
        });
      } catch {
        if (abandoned) return;
        setPhase("failed");
        handlers.current.onFailed();
      }
    }

    run();

    return () => {
      abandoned = true;
      // A dialog closed mid-search must not leave a thread hashing. The
      // challenge simply expires unspent.
      worker?.terminate();
    };
  }, []);

  return (
    <p
      className="text-afh-small text-afh-text-soft"
      data-testid="antibot-status"
      data-phase={phase}
      role="status"
    >
      {MESSAGES[phase]}
    </p>
  );
}
