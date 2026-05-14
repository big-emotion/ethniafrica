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
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { PageLayout } from "@/components/layout/PageLayout";
import { fetchDoctrineEntry } from "@/lib/doctrine/fetchDoctrineEntry";
import { formatVersionLabel } from "@/lib/doctrine/formatVersionLabel";

const DEFAULT_CHANGELOG_URL =
  "https://github.com/big-emotion/ethniafrica/commits/HEAD/supabase/migrations/016_editorial_doctrine_seed.sql";

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

export default async function DoctrineSlugPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;

  const entry = await fetchDoctrineEntry(slug);

  if (!entry) {
    notFound();
  }

  const versionLabel = formatVersionLabel(entry.version, entry.publishedAt);

  return (
    <PageLayout
      language="fr"
      onLanguageChange={() => {}}
      title={entry.title}
      sectionName="Doctrine éditoriale"
    >
      <article className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <header className="space-y-3 border-b pb-4">
          <h1 className="text-3xl font-bold">{entry.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span data-testid="version-label">{versionLabel}</span>
            <span aria-hidden="true">·</span>
            <a
              data-testid="changelog-link"
              href={CHANGELOG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Voir l&apos;historique des modifications
            </a>
          </div>
        </header>

        <div
          className="prose prose-neutral max-w-none"
          data-testid="doctrine-mdx"
        >
          <MDXRemote
            source={entry.mdxSource}
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
    </PageLayout>
  );
}
