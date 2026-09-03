import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { PageLayout } from "@/components/layout/PageLayout";
import { AdminSignInForm } from "./AdminSignInForm";

// @req REQ-042
export const metadata: Metadata = {
  title: "Accès à la modération",
  robots: { index: false, follow: false },
};

/**
 * The only sign-in surface the atlas has left.
 *
 * `/fr/compte/connexion` and `/fr/compte/inscription` are gone with the public
 * accounts they served: reporting costs no account, so nobody but a moderator
 * has a reason to sign in, and a moderator is an address on `admin_allowlist`.
 */
// @req REQ-042
export default function AdminSignInPage() {
  return (
    <PageLayout language="fr" title="Accès à la modération">
      <div className="mx-auto w-full max-w-md space-y-afh-xl py-afh-2xl">
        <p className="text-afh-small text-afh-text-soft">
          La modération est réservée aux adresses autorisées à l&apos;avance.
          Saisissez la vôtre pour recevoir un lien de connexion — il n&apos;y a
          ni mot de passe, ni compte à créer.
        </p>

        <Card className="rounded-afh-xl p-afh-xl md:p-afh-2xl">
          <AdminSignInForm />
        </Card>

        <p className="text-afh-caption text-afh-text-soft">
          Vous vouliez signaler une erreur&nbsp;? C&apos;est possible depuis
          n&apos;importe quelle fiche, sans compte.
        </p>
      </div>
    </PageLayout>
  );
}
