/**
 * /[lang]/doctrine/[slug] — Editorial doctrine MDX rendering page.
 *
 * Story ETNI-30 (1.10) — renders an `editorial_doctrine` row from Supabase
 * as MDX via `next-mdx-remote/rsc`.
 *
 * Security:
 *   - mdx_source is sanitized with rehype-sanitize.
 *   - MDXRemote receives an explicit components whitelist so arbitrary
 *     JSX components in MDX cannot be evaluated.
 *   - Supabase RLS on editorial_doctrine denies INSERT/UPDATE to anon
 *     (only service_role bypasses RLS).
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { PageLayout } from "@/components/layout/PageLayout";
import { TranslationProvenanceMarker } from "@/components/fiche/TranslationProvenanceMarker";
import { DOCTRINE_ENTRIES_EN } from "@/lib/doctrine/doctrineContent.en";
import { fetchDoctrineEntry } from "@/lib/doctrine/fetchDoctrineEntry";
import { formatVersionLabel } from "@/lib/doctrine/formatVersionLabel";
import { doctrineCopy } from "@/lib/i18n/copy/doctrine";
import { getLocalizedRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import { parseVersionedSlug } from "@/lib/versioned-slug";
import type { Language } from "@/types/shared";

const DEFAULT_CHANGELOG_URL =
  "https://github.com/big-emotion/ethniafrica/commits/HEAD/supabase/migrations/018_editorial_doctrine_seed.sql";

const CHANGELOG_URL =
  process.env.NEXT_PUBLIC_DOCTRINE_CHANGELOG_URL ?? DEFAULT_CHANGELOG_URL;

// Explicit whitelist of components allowed inside MDX. Empty object means
// MDX can only render standard HTML elements (after rehype-sanitize), not
// arbitrary React components.
const MDX_COMPONENTS = {};

interface PageParams {
  lang: string;
  slug: string;
}

/**
 * The head of a doctrine article: its canonical, on the live article, and
 * the locale it is indexed in. The title stays the root layout's — the
 * entry is read once, by the body, and a second read for a title is not
 * worth a database round trip on every request.
 */
// @req REQ-141
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const parsed = parseVersionedSlug(decodeURIComponent(slug));
  // A 404 that claims a canonical is a 404 asking to be indexed.
  if (!parsed || parsed.mode === "latest") return {};

  // A pinned revision is an archived copy of the same article: its canonical
  // is the live article, as it is for a fiche.
  const article = encodeURIComponent(parsed.slug);
  return surfaceHead(
    lang as Language,
    "doctrine",
    (locale) => `${getLocalizedRoute(locale, "doctrine")}/${article}`
  );
}

// @req REQ-091
export default async function DoctrineSlugPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { lang, slug } = await params;

  const parsed = parseVersionedSlug(decodeURIComponent(slug));

  if (!parsed || parsed.mode === "latest") {
    notFound();
  }

  const entry =
    parsed.mode === "pinned"
      ? await fetchDoctrineEntry(parsed.slug, parsed.version)
      : await fetchDoctrineEntry(parsed.slug);

  if (!entry) {
    notFound();
  }

  const language = lang as Language;
  const copy = doctrineCopy[language].article;
  const englishEntry =
    language === "en" && parsed.mode === "live"
      ? DOCTRINE_ENTRIES_EN[entry.slug]
      : undefined;
  const renderedEntry = englishEntry ?? entry;
  const frenchFallback = language === "en" && !englishEntry;
  const versionLabel = formatVersionLabel(
    entry.version,
    entry.publishedAt,
    language
  );

  return (
    <PageLayout
      language={language}
      title={renderedEntry.title}
      sectionName={copy.sectionName}
      hideHeader
      trailLabel={renderedEntry.title}
    >
      <div className="container mx-auto space-y-6 px-4 py-8">
        {frenchFallback ? (
          <p role="status" aria-label={copy.fallback}>
            {copy.fallback}
          </p>
        ) : (
          <TranslationProvenanceMarker
            translation={
              englishEntry
                ? { kind: englishEntry.provenance, stale: false }
                : null
            }
          />
        )}
        <article>
          <header
            className="space-y-3 border-b pb-4"
            lang={frenchFallback ? "fr" : undefined}
          >
            <h1 className="text-afh-h1 font-bold">{renderedEntry.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-afh-small text-muted-foreground">
              <span data-testid="version-label">{versionLabel}</span>
              <span aria-hidden="true">·</span>
              <a
                data-testid="changelog-link"
                href={CHANGELOG_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                {copy.changelog}
              </a>
            </div>
          </header>

          <div
            className="prose prose-neutral max-w-none mt-6"
            data-testid="doctrine-mdx"
            lang={frenchFallback ? "fr" : undefined}
          >
            <MDXRemote
              source={renderedEntry.mdxSource}
              components={MDX_COMPONENTS}
              options={{
                mdxOptions: {
                  remarkPlugins: [remarkGfm],
                  rehypePlugins: [rehypeSanitize],
                },
              }}
            />
          </div>
        </article>
      </div>
    </PageLayout>
  );
}
