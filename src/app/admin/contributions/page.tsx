"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Contribution } from "@/lib/supabase/admin-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type PendingAction =
  | { kind: "approve"; id: string }
  | { kind: "reject"; id: string };

// @req REQ-091
export default function AdminContributionsPage() {
  const router = useRouter();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );
  const [rejectNotes, setRejectNotes] = useState("");

  const loadContributions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/contributions");
      if (!response.ok) {
        if (response.status === 401) {
          // Non authentifié, rediriger vers login
          router.push("/admin/login?redirect=/admin/contributions");
          return;
        }
        throw new Error("Failed to load contributions");
      }
      const data = await response.json();
      setContributions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadContributions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeConfirmation() {
    setPendingAction(null);
    setRejectNotes("");
  }

  async function confirmApprove(id: string) {
    try {
      const response = await fetch(`/api/admin/contributions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/admin/login?redirect=/admin/contributions");
          return;
        }
        throw new Error("Failed to approve contribution");
      }
      await loadContributions();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function confirmReject(id: string) {
    try {
      const response = await fetch(`/api/admin/contributions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          moderator_notes: rejectNotes || null,
        }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/admin/login?redirect=/admin/contributions");
          return;
        }
        throw new Error("Failed to reject contribution");
      }
      await loadContributions();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleConfirm() {
    if (!pendingAction) return;
    setActionError(null);
    if (pendingAction.kind === "approve") {
      await confirmApprove(pendingAction.id);
    } else {
      await confirmReject(pendingAction.id);
    }
    closeConfirmation();
  }

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
      });
      if (response.ok) {
        router.push("/admin/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 font-afh text-afh-text-soft" role="status">
        Loading contributions...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-8 font-afh text-afh-classification-disputed"
        role="alert"
      >
        Error: {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8 font-afh text-afh-text">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-afh-display text-3xl font-black text-afh-text">
          Contributions Pending Review
        </h1>
        <Button onClick={handleLogout} variant="outline">
          Logout
        </Button>
      </div>

      {actionError && (
        <p
          role="alert"
          className="mb-4 font-afh text-sm text-afh-classification-disputed"
        >
          {actionError}
        </p>
      )}

      {contributions.length === 0 ? (
        <p className="text-afh-text-soft">No pending contributions.</p>
      ) : (
        <div className="space-y-4">
          {contributions.map((contribution) => (
            <article
              key={contribution.id}
              className="space-y-2 rounded-afh-base border border-afh-border bg-afh-surface p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-afh-text">
                    Type: {contribution.type}
                  </h3>
                  <p className="text-sm text-afh-text-soft">
                    Submitted:{" "}
                    {new Date(contribution.created_at).toLocaleString()}
                  </p>
                  {contribution.contributor_name && (
                    <p className="text-sm text-afh-text">
                      Contributor: {contribution.contributor_name}
                    </p>
                  )}
                  {contribution.notes && (
                    <p className="mt-2 text-sm text-afh-text">
                      {contribution.notes}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      setPendingAction({ kind: "approve", id: contribution.id })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      setPendingAction({ kind: "reject", id: contribution.id })
                    }
                  >
                    Reject
                  </Button>
                </div>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-afh-text-soft">
                  View payload
                </summary>
                <pre className="mt-2 overflow-auto rounded-afh-base bg-afh-bg-warm p-2 text-xs text-afh-text">
                  {JSON.stringify(contribution.proposed_payload, null, 2)}
                </pre>
              </details>
            </article>
          ))}
        </div>
      )}

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) closeConfirmation();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.kind === "approve"
                ? "Confirm approval"
                : "Confirm rejection"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingAction?.kind === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="reject-notes">Rejection notes (optional)</Label>
              <Input
                id="reject-notes"
                value={rejectNotes}
                onChange={(event) => setRejectNotes(event.target.value)}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeConfirmation}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
