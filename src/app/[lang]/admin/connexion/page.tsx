import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { PageLayout } from "@/components/layout/PageLayout";
import { adminCopy } from "@/lib/i18n/copy/admin";
import type { Language } from "@/types/shared";
import { AdminSignInForm } from "./AdminSignInForm";

// @req REQ-042
export async function generateMetadata({
  params,
}: {
  params?: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = (await params) ?? { lang: "fr" };
  return {
    title: adminCopy[lang as Language].signIn.metadataTitle,
    robots: { index: false, follow: false },
  };
}

/**
 * The only sign-in surface the atlas has left.
 *
 * `/fr/compte/connexion` and `/fr/compte/inscription` are gone with the public
 * accounts they served: reporting costs no account, so nobody but a moderator
 * has a reason to sign in, and a moderator is an address on `admin_allowlist`.
 */
// @req REQ-042
export default async function AdminSignInPage({
  params,
}: {
  params?: Promise<{ lang: string }>;
}) {
  const { lang } = (await params) ?? { lang: "fr" };
  const language = lang as Language;
  const copy = adminCopy[language].signIn;
  return (
    <PageLayout language={language} title={copy.title}>
      <div className="mx-auto w-full max-w-md space-y-afh-xl py-afh-2xl">
        <p className="text-afh-small text-afh-text-soft">{copy.introduction}</p>

        <Card className="rounded-afh-xl p-afh-xl md:p-afh-2xl">
          <AdminSignInForm language={language} />
        </Card>

        <p className="text-afh-caption text-afh-text-soft">{copy.reportHint}</p>
      </div>
    </PageLayout>
  );
}
