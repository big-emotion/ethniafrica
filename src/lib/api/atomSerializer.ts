import type { FeedRevisionItem } from "@/api/v2/services/feedRevisions";

const FEED_TITLE = "EthniAfrica Revisions Feed";
const FEED_ID_BASE = "https://africahistory.org/feeds/revisions";

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
