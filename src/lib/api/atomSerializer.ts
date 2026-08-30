import type { FeedRevisionItem } from "@/api/v2/services/feedRevisions";
import { PRODUCT_NAME, CANONICAL_DOMAIN } from "@/lib/brand";

const FEED_TITLE = `${PRODUCT_NAME} Revisions Feed`;

/**
 * An Atom `id` is a permanent IRI, so it is the one string here that must not
 * be allowed to drift — and it was the one built on a domain the project does
 * not own, in a file whose title constant already said EthniAfrica. Corrected
 * before production rather than after, because a published feed id cannot be
 * changed without every subscriber re-seeing every entry.
 */
const FEED_ID_BASE = `https://${CANONICAL_DOMAIN}/feeds/revisions`;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface AtomFeedOptions {
  baseUrl: string;
  feedUrl: string;
  /** ISO timestamp derived from data — must never be Date.now() (NFR32). */
  updated: string;
}

export function buildAtomFeed(
  items: FeedRevisionItem[],
  options: AtomFeedOptions
): string {
  const feedUpdated =
    items.length > 0 && items[0].published_at
      ? items[0].published_at
      : options.updated;

  const entries = items.map((item) => {
    const entryId = `${FEED_ID_BASE}/${item.entity_type}/${item.entity_id}/v${item.version}`;
    const entryUpdated = item.published_at ?? options.updated;
    const title = `${item.entity_id} v${item.version}`;
    const link = `${options.baseUrl}${item.pinned_url}`;
    const summary =
      item.summary ?? `Revision ${item.version} of ${item.entity_id}`;

    return [
      "  <entry>",
      `    <id>${escapeXml(entryId)}</id>`,
      `    <title>${escapeXml(title)}</title>`,
      `    <updated>${escapeXml(entryUpdated)}</updated>`,
      `    <link href="${escapeXml(link)}" rel="alternate"/>`,
      `    <category term="${escapeXml(item.entity_type)}"/>`,
      `    <summary>${escapeXml(summary)}</summary>`,
      "  </entry>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <title>${escapeXml(FEED_TITLE)}</title>`,
    `  <id>${escapeXml(FEED_ID_BASE)}</id>`,
    `  <updated>${escapeXml(feedUpdated)}</updated>`,
    `  <link href="${escapeXml(options.feedUrl)}" rel="self"/>`,
    `  <link href="${escapeXml(options.baseUrl)}" rel="alternate"/>`,
    ...entries,
    "</feed>",
  ].join("\n");
}
