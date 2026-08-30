import type { Metadata } from "next";

import { ModerationQueue } from "@/components/admin/ModerationQueue";
import { PageLayout } from "@/components/layout/PageLayout";
import { listFlags } from "@/api/v2/services/flags";
import { getModeratorSession } from "@/lib/supabase/moderator";

/**
 * The moderator's queue.
 *
 * `middleware.ts` has guarded `/fr/admin/*` since ETNI-66, and until now it
 * guarded an empty directory: the only file under it was the sign-in page,
 * which redirected a successful login straight into a 404. `getModeratorSession`
 * carried the doc comment "call this at the top of any admin Server Component"
 * and was called by no non-test file.
 *
 * This is deliberately the queue and not the dashboard ETNI-67 describes —
 * four KPI cards, a `moderator_dashboard_kpis` RPC, trend arrows, a twenty-row
 * activity feed. What closes the loop is being able to see a report and act on
 * it; the ticket stays open for the rest.
 *
 * The session check is redundant with the middleware and kept anyway: a
 * middleware matcher is a configuration line, and an authorization that lives
 * only in configuration is one edit away from being gone.
 */

// @req REQ-042
export const metadata: Metadata = {
  title: "Signalements à traiter",
  robots: { index: false, follow: false },
};

// Reports are mutable and the queue must never be served stale to the person
// deciding on them.
// @req REQ-042
export const dynamic = "force-dynamic";

// @req REQ-042
export default async function ModerationQueuePage() {
  await getModeratorSession();

  // Oldest first: a queue that hides its backlog behind the newest arrivals
  // is how a report waits six months.
  const [open, underReview] = await Promise.all([
    listFlags({ status: "open", limit: 50 }),
    listFlags({ status: "under_review", limit: 50 }),
  ]);
  const reports = [...underReview.items, ...open.items];

  return (
    <PageLayout language="fr" title="Signalements à traiter">
      <div className="mx-auto w-full max-w-4xl space-y-afh-xl">
        <p className="max-w-3xl text-afh-small text-afh-text-soft">
          Les signalements ouverts et ceux en cours d&apos;examen. Une décision
          qui clôt un signalement demande une note&nbsp;: elle est publiée avec
          lui.
        </p>

        {reports.length === 0 ? (
          <p className="text-afh-small text-afh-text-soft">
            Aucun signalement en attente.
          </p>
        ) : (
          <ModerationQueue reports={reports} />
        )}
      </div>
    </PageLayout>
  );
}
