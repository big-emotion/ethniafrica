/**
 * /[lang]/doctrine/[slug] — Editorial doctrine MDX rendering page.
 *
 * Story ETNI-30 (1.10) — renders an `editorial_doctrine` row from Supabase
 * as MDX via `next-mdx-remote/rsc`.
 *
 * Acceptance criteria:
 *   - Fetches the current (non-superseded, highest version) row by slug.
 *   - Renders mdx_source via MDXRemote with remark-gfm.
 *   - Shows version label "v{n} · publiée le {long French date}".
 *   - Shows a changelog link (static git-commit URL, MVP per AR34).
 *   - Calls notFound() for unknown slugs (calm 404).
 *
 * Changelog link approach (MVP):
 *   We point to the GitHub commit history of the seed migration file.
 *   For a richer changelog we will switch to per-version metadata once
 *   ETNI-22's reconciliation lands a `commit_sha` column.
 */
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { PageLayout } from "@/components/layout/PageLayout";
import { fetchDoctrineEntry } from "@/lib/doctrine/fetchDoctrineEntry";
import { formatVersionLabel } from "@/lib/doctrine/formatVersionLabel";

// MVP changelog: link to the migrations folder history on GitHub.
// Override at deploy time via DOCTRINE_CHANGELOG_URL if needed.
const CHANGELOG_URL =
  process.env.DOCTRINE_CHANGELOG_URL ??
  "https://github.com/big-emotion/ethniafrica/commits/main/supabase/migrations/016_editorial_doctrine_seed.sql";

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
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
              },
            }}
          />
        </div>
      </article>
    </PageLayout>
  );
}
