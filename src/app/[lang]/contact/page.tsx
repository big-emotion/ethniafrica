import type { Metadata } from "next";

import { ContactAside } from "@/components/contact/ContactAside";
import { ContactForm } from "@/components/contact/ContactForm";
import { PageLayout } from "@/components/layout/PageLayout";
import { pickDidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import { getStaticPageRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

/**
 * The contact page.
 *
 * It replaces a Typeform embed on `/fr/contribute` that announced a form
 * « ci-dessous » and rendered nothing — a third-party script the page's own
 * CSP had no reason to admit, under a sentence that promised it worked.
 *
 * Following the legal-page idiom: French copy in the clear, and no
 * `generateStaticParams` — the root layout awaits `connection()` for the CSP
 * nonce, so a route marked static answers 500 at request time. That also
 * makes the draw below a per-request one, which is what it has to be.
 */

interface ContactPageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-045
// @req REQ-140
export async function generateMetadata({
  params,
}: ContactPageProps): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: "Contactez-nous",
    description:
      "Écrire à l'atlas : signaler une erreur, proposer une source, demander une réutilisation des données.",
    alternates: {
      canonical: getStaticPageRoute(lang as Language, "contact"),
    },
  };
}

// @req REQ-045
export default async function ContactPage({ params }: ContactPageProps) {
  const { lang } = await params;
  const fact = pickDidYouKnowFact();

  return (
    <PageLayout language={lang as Language} hideHeader>
      <article className="mx-auto max-w-5xl pb-16 pt-4 md:pb-24 md:pt-8">
        <header className="border-b border-afh-border pb-10 md:pb-14">
          <p className="text-afh-eyebrow font-semibold uppercase tracking-[0.16em] text-afh-terracotta">
            Écrire à l&apos;atlas
          </p>
          <h1 className="mt-4 max-w-[18ch] text-afh-h1 font-display font-bold leading-[1.05] text-afh-text">
            Contactez-nous
          </h1>
          <p className="mt-8 text-afh-lead leading-[1.45] text-afh-text-soft">
            Une erreur sur une fiche, une source à verser au corpus, une
            réutilisation des données à discuter : écrivez-nous. Chaque message
            arrive dans la même boîte, et l&apos;objet que vous choisissez est
            ce qui la trie.
          </p>
        </header>

        {/* The form leads in the document, and takes the right-hand column
            from `lg` up. Stacked on a phone the reader meets the thing the
            page exists for first; side by side the anecdote sits where the
            eye starts, which is the arrangement the reference uses. */}
        <div className="grid gap-10 pt-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-14 lg:pt-14">
          <section className="lg:order-last">
            <h2 className="text-afh-h2 font-display font-bold text-afh-text">
              Envoyer un message
            </h2>
            <div className="mt-6">
              <ContactForm />
            </div>
          </section>

          <div className="lg:order-first">
            <ContactAside fact={fact} />
          </div>
        </div>
      </article>
    </PageLayout>
  );
}
