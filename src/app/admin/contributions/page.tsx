"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getPendingContributions } from "@/lib/supabase/admin-queries";
import type { Contribution } from "@/lib/supabase/admin-queries";
import { Button } from "@/components/ui/button";

export default function AdminContributionsPage() {
  const router = useRouter();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [loadContributions]);

  const handleApprove = async (id: string) => {
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
      alert(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleReject = async (id: string) => {
    const notes = prompt("Rejection notes (optional):");
    try {
      const response = await fetch(`/api/admin/contributions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          moderator_notes: notes || null,
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
      alert(err instanceof Error ? err.message : "Unknown error");
    }
  };

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
    return <div className="p-8">Loading contributions...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Contributions Pending Review</h1>
        <Button onClick={handleLogout} variant="outline">
          Logout
        </Button>
      </div>
      {contributions.length === 0 ? (
        <p>No pending contributions.</p>
      ) : (
        <div className="space-y-4">
          {contributions.map((contribution) => (
            <div
              key={contribution.id}
              className="border rounded-lg p-4 space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">Type: {contribution.type}</h3>
                  <p className="text-sm text-gray-600">
                    Submitted:{" "}
                    {new Date(contribution.created_at).toLocaleString()}
                  </p>
                  {contribution.contributor_name && (
                    <p className="text-sm">
                      Contributor: {contribution.contributor_name}
                    </p>
                  )}
                  {contribution.notes && (
                    <p className="text-sm mt-2">{contribution.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(contribution.id)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(contribution.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-gray-600">
                  View payload
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(contribution.proposed_payload, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
