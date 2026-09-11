/**
 * The tagged outbound link, in one place.
 *
 * Before this module every link in a description was typed by hand, and the
 * audience audit of 2026-09-07 found the result: not one outbound link carried
 * a parameter, so every visit arriving from a video landed in Plausible's
 * "Direct / None" bucket — the site's second largest and the one with its best
 * visit duration, and therefore the one place where a video that converted
 * could not be told from one that did not.
 *
 * The scheme is `description-template-2026-09-09.md`'s and is not restated
 * there and here as prose: this file is its executable copy, and
 * `links.test.mjs` is what holds the two together.
 *
 * The pure half lives here so `build-index.mjs` can render the same links into
 * a post.md without shelling out to the CLI or reaching the network.
 */

export const SITE = "https://ethniafrica.com";

/** The five profiles that carry a link, in the order the template lists them. */
export const NETWORKS = [
  "youtube",
  "tiktok",
  "instagram",
  "facebook",
  "linkedin",
];

/**
 * What the link was attached to. It is the only axis that separates a story
 * from the post it accompanies, which is the one way to learn whether the
 * Instagram link sticker is worth the extra step it costs to publish.
 */
export const CONTENTS = [
  "video",
  "carrousel",
  "image",
  "story",
  "commentaire-epingle",
  "bio",
];

/**
 * A campaign slug has to survive being retyped on five platforms by a human in
 * a hurry. Accents, capitals and spaces are what make two spellings of one
 * subject, and two spellings are two campaigns that never add up again.
 */
const CAMPAIGN_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertCampaignSlug(campaign) {
  if (!CAMPAIGN_SLUG.test(campaign ?? "")) {
    throw new Error(
      `campaign "${campaign}" is not a slug: lowercase letters, digits and single hyphens only`
    );
  }
}

/** One tagged URL. The parameter order is the template's, and readers read it. */
export function tag(path, network, campaign, content) {
  if (!path.startsWith("/")) {
    throw new Error(`path "${path}" must start with a slash`);
  }
  assertCampaignSlug(campaign);
  const query = [
    `utm_source=${network}`,
    "utm_medium=social",
    `utm_campaign=${campaign}`,
    `utm_content=${content}`,
  ].join("&");
  return `${SITE}${path}?${query}`;
}

/**
 * The five to seven links one subject needs: one per network in the format the
 * piece actually is, plus the two placements that are their own measurement —
 * the Instagram story, and the pinned YouTube comment that carries the link the
 * description cannot make clickable.
 */
export function buildLinks({ path, campaign, content = "video" }) {
  const placements = [
    ...NETWORKS.map((network) => ({ network, content })),
    { network: "instagram", content: "story" },
    { network: "youtube", content: "commentaire-epingle" },
  ];
  return placements.map(({ network, content: placement }) => ({
    network,
    content: placement,
    url: tag(path, network, campaign, placement),
  }));
}

/** The five bio links, which only a human can install. */
export function buildBioLinks(path = "/fr") {
  return NETWORKS.map((network) => ({
    network,
    content: "bio",
    url: tag(path, network, "bio", "bio"),
  }));
}

const ACCENTS = /[̀-ͯ]/g;

/**
 * A title's campaign slug. Offered as a starting point, never applied silently:
 * a slug is read in a Plausible report months later, so the operator gets to
 * shorten it before it is written down anywhere.
 */
export function campaignSlugOf(title) {
  return title
    .normalize("NFD")
    .replace(ACCENTS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The title the root layout hands to any page that supplies none of its own.
 *
 * A fiche whose identifier does not exist is served this, with a 200. Measured
 * 2026-09-09: `/fr/atlas/noms/PAT_NEXISTEPAS` answers 200 and renders it. So a
 * status check alone certifies dead links as live, which is the exact failure
 * this verification exists to prevent.
 */
export const ROOT_FALLBACK_TITLE =
  "EthniAfrica | Dictionnaire des Ethnies d'Afrique";

const TITLE = /<title>([^<]*)<\/title>/i;

/** The rendered `<title>`, with the entities a browser would resolve. */
export function titleOf(html) {
  const found = html.match(TITLE);
  if (!found) return null;
  return found[1]
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

/**
 * Whether a response is a page worth spending a click on. Three ways it is not,
 * and only the first is the one anybody expects.
 */
export function judge({ status, landedOn, title }) {
  if (status !== 200) return { ok: false, reason: `répond ${status}` };
  if (!landedOn.includes("utm_campaign=")) {
    return { ok: false, reason: `atterrit sur ${landedOn}, sans le balisage` };
  }
  if (title === ROOT_FALLBACK_TITLE) {
    return {
      ok: false,
      reason:
        "répond 200 mais rend le titre par défaut du site : la fiche n'existe pas",
    };
  }
  return { ok: true, reason: `200 · ${title}` };
}

/**
 * Whether the page a link points at actually answers.
 *
 * A tagged link to a dead page is worse than an untagged one: it spends the
 * click the video earned and reports the campaign as working. Called with the
 * parameters attached rather than on the bare path, because the parameters are
 * exactly what a redirect can silently eat, and this is where that would show.
 */
export async function verify(url) {
  const response = await fetch(url, { redirect: "follow" });
  const observed = {
    status: response.status,
    landedOn: response.url,
    title: titleOf(await response.text()),
  };
  return { ...observed, ...judge(observed) };
}
