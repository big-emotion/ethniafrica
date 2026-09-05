import type { Metadata } from "next";
import Link from "next/link";

import { PageLayout } from "@/components/layout/PageLayout";
import { verifyReporterContact } from "@/lib/flags/reporterContact";
import { getStaticPageRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

// @req REQ-012
export const metadata: Metadata = {
  title: "Confirmation de votre adresse",
  robots: { index: false, follow: false },
};

// The token is spent on arrival, so this page can never be served from a cache.
// @req REQ-012
export const dynamic = "force-dynamic";

interface VerifyPageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ token?: string }>;
}

/**
 * The other end of the verification link.
 *
 * It confirms an address and nothing more: the report itself was published the
 * moment it was sent, and is already visible on `/fr/signalements`. Following
 * this link decides only whether the moderation's decision comes back by
 * e-mail — which is why an expired or unknown token is a mild disappointment
 * here rather than a lost report.
 */
// @req REQ-012
export default async function VerifyReporterEmailPage({
  params,
  searchParams,
}: VerifyPageProps) {
  const { lang } = await params;
  const language = lang as Language;
  const registerRoute = getStaticPageRoute(language, "reports");
  const outcome = await verifyReporterContact((await searchParams).token);

  const copy = {
    verified: {
      title: "Adresse confirmée",
      body: "Vous recevrez un message dès que la modération aura tranché sur votre signalement.",
    },
    "already-verified": {
      title: "Adresse déjà confirmée",
      body: "Ce lien avait déjà été utilisé. Rien à faire de plus : votre adresse est bien enregistrée.",
    },
    expired: {
      title: "Lien expiré",
      body: "Ce lien de confirmation avait une validité de 24 heures. Votre signalement, lui, est toujours enregistré et consultable — seule la notification par e-mail ne pourra pas vous être envoyée.",
    },
    unknown: {
      title: "Lien inconnu",
      body: "Ce lien ne correspond à aucune confirmation en attente. Si vous avez envoyé un signalement, il est enregistré et consultable dans le registre public.",
    },
  }[outcome.status];

  const publicSlug = "publicSlug" in outcome ? outcome.publicSlug : null;

  return (
    <PageLayout language={language} title={copy.title}>
      <div className="mx-auto w-full max-w-2xl space-y-afh-xl py-afh-2xl">
        <p className="text-afh-body text-afh-text">{copy.body}</p>

        <Link
          className="inline-flex min-h-11 items-center font-semibold text-afh-terracotta underline underline-offset-4"
          href={publicSlug ? `${registerRoute}/${publicSlug}` : registerRoute}
        >
          {publicSlug
            ? "Consulter votre signalement"
            : "Voir le registre des signalements"}
        </Link>
      </div>
    </PageLayout>
  );
}
