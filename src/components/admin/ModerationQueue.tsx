"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserSupabaseClient } from "@/lib/supabase/auth-client";

export interface QueuedReport {
  id: string;
  public_slug: string;
  status: string;
  flag_kind: string;
  reason_text: string | null;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
}

export interface ModerationQueueProps {
  reports: readonly QueuedReport[];
}

/**
 * The moves the trigger allows out of each state.
 *
 * `flags_enforce_state_machine` (migration 022) is the authority; this table
 * mirrors it so the screen never offers a button the database will refuse.
 * When they disagree the trigger wins and the moderator sees a 409 — which is
 * the right failure, but a screen that provokes it teaches its user to expect
 * errors.
 */
const MOVES: Record<
  string,
  ReadonlyArray<{ status: string; label: string }>
> = {
  open: [{ status: "under_review", label: "Examiner" }],
  under_review: [
    { status: "accepted", label: "Accepter" },
    { status: "rejected", label: "Rejeter" },
    { status: "duplicate", label: "Doublon" },
  ],
};

/** States that close a report, and therefore require a stated reason. */
const TERMINAL = new Set(["accepted", "rejected", "duplicate"]);

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  under_review: "En cours d'examen",
  accepted: "Accepté",
  rejected: "Rejeté",
  duplicate: "Doublon",
  withdrawn: "Retiré",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// @req REQ-042
export function ModerationQueue({ reports }: ModerationQueueProps) {
  return (
    <ul className="flex flex-col gap-afh-lg" data-testid="moderation-queue">
      {reports.map((report) => (
        <QueueRow key={report.id} report={report} />
      ))}
    </ul>
  );
}

function QueueRow({ report }: { report: QueuedReport }) {
  const noteId = useId();
  const [status, setStatus] = useState(report.status);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const moves = MOVES[status] ?? [];

  async function apply(next: string) {
    // Charter §5: a terminal decision carries its reason. Closing in silence
    // tells the reporter their report was read and nothing more.
    if (TERMINAL.has(next) && !note.trim()) {
      setError("Expliquez votre décision avant de clore ce signalement.");
      return;
    }

    setPending(true);
    setError("");

    const {
      data: { session },
    } = await createBrowserSupabaseClient().auth.getSession();

    const response = await fetch(`/api/v2/flags/${report.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({
        status: next,
        ...(note.trim() ? { moderator_notes: note.trim() } : {}),
      }),
    });
    const json = await response.json();

    setPending(false);

    if (!response.ok) {
      // The API's own words, not a generic failure: a moderator who is told
      // "échec" cannot tell a refused transition from a lost connection.
      setError(json?.errors?.[0]?.message ?? "La transition a échoué.");
      return;
    }

    setStatus(json.data.status);
    setNote("");
  }

  return (
    <li className="rounded-afh-md border border-afh-border p-afh-lg">
      <div className="flex flex-wrap items-baseline gap-afh-md text-afh-caption text-afh-text-soft">
        <span className="font-mono">{report.public_slug}</span>
        <span>{STATUS_LABELS[status] ?? status}</span>
        <span>{formatDate(report.created_at)}</span>
        {report.target_id && <span>{report.target_id}</span>}
      </div>

      <p className="mt-afh-md text-afh-body">{report.reason_text}</p>

      {moves.length > 0 && (
        <>
          <div className="mt-afh-md">
            <Label htmlFor={noteId}>Note de modération</Label>
            <Textarea
              id={noteId}
              maxLength={5000}
              onChange={(event) => setNote(event.target.value)}
              value={note}
            />
          </div>

          <div className="mt-afh-md flex flex-col gap-afh-md min-[480px]:flex-row">
            {moves.map((move) => (
              <Button
                disabled={pending}
                key={move.status}
                onClick={() => apply(move.status)}
                type="button"
                variant="outline"
              >
                {move.label}
              </Button>
            ))}
          </div>
        </>
      )}

      {error && (
        <p className="mt-afh-md text-afh-small text-afh-flag-open" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
