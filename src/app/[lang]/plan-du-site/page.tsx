import type { Metadata } from "next";
import Link from "next/link";

import { ChapterHeading } from "@/components/pages/ChapterHeading";
import { PageLayout } from "@/components/layout/PageLayout";
import { getStaticPageRoute } from "@/lib/routing";
import { getSiteTree } from "@/lib/siteTree";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

/**
 * The site plan.
 *
 * It lists the rubrics and the ways in, never the 890 fiches — those are the
 * sitemap's job, and a page enumerating them would be unreadable by the only
 * audience a site plan has, which is a person who is lost.
 *
 * Following the legal-page idiom: no `generateStaticParams` — the root layout
 * awaits `connection()` for the CSP nonce, so a route marked static answers
 * 500 at request time.
 */

interface SitemapPageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-088
// @req REQ-140
export async function generateMetadata({
  params,
}: SitemapPageProps): Promise<Metadata> {
  const { lang } = await params;
  const copy = getTranslation(lang as Language).sitemapPage;
  return {
    title: copy.title,
    description: copy.introduction,
    alternates: {
      canonical: getStaticPageRoute(lang as Language, "sitemap"),
    },
  };
}

// @req REQ-088
export default async function SitemapPage({ params }: SitemapPageProps) {
  const { lang } = await params;
  const language = lang as Language;
  const copy = getTranslation(language).sitemapPage;
  const sections = getSiteTree(language);

  return (
    <PageLayout language={language} hideHeader>
      <article className="mx-auto max-w-5xl pb-16 pt-4 md:pb-24 md:pt-8">
        <header className="border-b border-afh-border pb-10 md:pb-14">
          <p className="text-afh-eyebrow font-semibold uppercase tracking-[0.16em] text-afh-terracotta">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 max-w-[18ch] text-afh-hero font-display font-semibold leading-[1.05] text-afh-text">
            {copy.title}
          </h1>
          <div className="mt-8">
            <p className="text-afh-lead leading-[1.45] text-afh-text-soft">
              {copy.introduction}
            </p>
          </div>
        </header>

        <div className="divide-y divide-afh-border">
          {sections.map((section, index) => (
            <section key={section.id} className="py-9 md:py-12">
              <ChapterHeading
                stepLabel={`${String(index + 1).padStart(2, "0")} · Rubrique`}
                heading={section.title}
              />
              <div className="mt-5">
                <p className="text-afh-body leading-[1.65] text-afh-text-soft">
                  {section.blurb}
                </p>
                <ul className="mt-6 space-y-4">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-afh-body font-semibold text-afh-text underline decoration-afh-border underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {link.label}
                      </Link>
                      {link.note && (
                        <p className="mt-1 text-afh-small leading-[1.5] text-afh-fg-muted">
                          {link.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      </article>
    </PageLayout>
  );
}
