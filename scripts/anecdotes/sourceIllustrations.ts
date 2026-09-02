/**
 * Find a freely licensed illustration for each anecdote, and read the licence
 * off each provider's API rather than assuming it.
 *
 * Run by hand, in two passes:
 *
 *   npx tsx scripts/anecdotes/sourceIllustrations.ts search queries.json > candidates.json
 *   npx tsx scripts/anecdotes/sourceIllustrations.ts fetch chosen.json
 *
 * The split is deliberate. The first pass proposes and a human decides: a
 * search engine ranks by term frequency, not by whether the picture is the
 * document the anecdote is *about*, and the brand charter's imagery rule
 * (§9) is exactly the part no query can satisfy on its own. Downloading
 * whatever came first would fill the page with stock photography of a
 * continent, which is the failure that rule exists to prevent.
 *
 * **Four providers, because one was not enough.** Wikimedia Commons covers
 * places and people well and museum objects badly; a sweep of forty-three
 * anecdotes left nine with nothing usable, most of them wanting an object —
 * a Teke figure, a Toura mask. The Met and Cleveland publish their open
 * collections at CC0 with no key, and Openverse aggregates the rest of the
 * Creative Commons web. Each is queried in turn and the candidates are
 * merged, tagged with the provider that offered them.
 *
 * No licence is inferred. Commons' `extmetadata.LicenseShortName` is matched
 * against an allow-list; the Met is taken only where `isPublicDomain` is
 * true; Cleveland is asked for `cc0=1`; Openverse is asked for `cc0,by,by-sa`
 * and its answer is checked again on the way out. Anything a provider
 * declines to state is dropped before it reaches the report, because a
 * licence nobody read is a licence nobody can honour.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import sharp from "sharp";

const OUTPUT_DIR = join(process.cwd(), "public/images/anecdotes");

/**
 * Wikimedia answers an unthrottled sweep with 429 and no partial results, so
 * the pause is not politeness alone — without it the run silently covers nine
 * queries out of forty-three and reports success.
 */
const PAUSE_MS = 1200;
const RETRIES = 4;

// ASCII only: a header value is a ByteString, and an em dash here makes every
// request throw before it leaves the process — which reads as "no results".
const USER_AGENT =
  "EthniAfrica-atlas/4 (anecdote illustration sourcing; contact via repository)";

/**
 * The longest edge we keep. The card displays the picture at 460 px at most,
 * so 900 px is already a two-times source; the previous batch was fetched at
 * 1100 px and averages 233 Ko per file, which is weight the repository
 * carries forever for pixels no screen shows.
 */
const LONG_EDGE = 900;
const JPEG_QUALITY = 70;

/**
 * Licences whose terms this site can actually honour. CC BY and CC BY-SA
 * require an attribution the reader can see; the card prints one. Anything
 * with NC or ND, and anything unstated, is not proposed at all.
 */
const FREE_LICENCES =
  /^(cc0|cc[ -]by(-sa)?([ -][0-9.]+)?|public domain|pd-.*|no restrictions)$/i;

type Provider = "commons" | "met" | "cleveland" | "openverse";

interface Candidate {
  factId: string;
  provider: Provider;
  query: string;
  title: string;
  /** The page a reader can open to check the file and its terms. */
  filePage: string;
  imageUrl: string;
  licence: string;
  licenceUrl: string;
  author: string;
  description: string;
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries a throttled request with a widening delay before giving up. */
async function politeFetch(url: string | URL): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (response.status !== 429 || attempt >= RETRIES) return response;
    await pause(PAUSE_MS * (attempt + 2));
  }
}

async function json<T>(url: string | URL): Promise<T | null> {
  const response = await politeFetch(url);
  if (!response.ok) return null;
  return (await response.json()) as T;
}

/** Provider descriptions arrive as HTML fragments; a credit line is text. */
function plain(value: string | undefined | null, limit = 300): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

// ————————————————————————————————————————————————————————————————————————
// Wikimedia Commons — places, people, historical documents
// ————————————————————————————————————————————————————————————————————————

interface CommonsPage {
  title: string;
  imageinfo?: {
    thumburl?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
}

async function searchCommons(
  factId: string,
  query: string
): Promise<Candidate[]> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `${query} filetype:bitmap`);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "6");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|extmetadata");
  url.searchParams.set("iiurlwidth", String(LONG_EDGE));

  const payload = await json<{
    query?: { pages?: Record<string, CommonsPage> };
  }>(url);

  return Object.values(payload?.query?.pages ?? {}).flatMap((page) => {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl) return [];
    const meta = info.extmetadata ?? {};
    const licence = plain(meta.LicenseShortName?.value, 60);
    if (!FREE_LICENCES.test(licence)) return [];

    return [
      {
        factId,
        provider: "commons" as const,
        query,
        title: page.title,
        filePage: info.descriptionurl ?? "",
        imageUrl: info.thumburl,
        licence,
        licenceUrl: plain(meta.LicenseUrl?.value, 120),
        author: plain(meta.Artist?.value, 120),
        description: plain(meta.ImageDescription?.value),
      },
    ];
  });
}

// ————————————————————————————————————————————————————————————————————————
// The Metropolitan Museum of Art — objects, CC0 where isPublicDomain
// ————————————————————————————————————————————————————————————————————————

async function searchMet(factId: string, query: string): Promise<Candidate[]> {
  const search = new URL(
    "https://collectionapi.metmuseum.org/public/collection/v1/search"
  );
  search.searchParams.set("q", query);
  search.searchParams.set("hasImages", "true");

  const found = await json<{ objectIDs?: number[] }>(search);
  const ids = (found?.objectIDs ?? []).slice(0, 3);

  const candidates: Candidate[] = [];
  for (const id of ids) {
    const object = await json<{
      isPublicDomain?: boolean;
      primaryImage?: string;
      primaryImageSmall?: string;
      objectURL?: string;
      title?: string;
      artistDisplayName?: string;
      objectDate?: string;
      culture?: string;
      creditLine?: string;
    }>(
      `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`
    );
    await pause(PAUSE_MS / 3);

    const image = object?.primaryImageSmall || object?.primaryImage;
    if (!object?.isPublicDomain || !image) continue;

    candidates.push({
      factId,
      provider: "met",
      query,
      title: plain(object.title, 160),
      filePage: object.objectURL ?? "",
      imageUrl: image,
      licence: "CC0",
      licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      author: plain(object.artistDisplayName, 120),
      description: plain(
        [object.culture, object.objectDate, object.creditLine]
          .filter(Boolean)
          .join(" — ")
      ),
    });
  }
  return candidates;
}

// ————————————————————————————————————————————————————————————————————————
// Cleveland Museum of Art — objects, CC0 only
// ————————————————————————————————————————————————————————————————————————

async function searchCleveland(
  factId: string,
  query: string
): Promise<Candidate[]> {
  const url = new URL("https://openaccess-api.clevelandart.org/api/artworks/");
  url.searchParams.set("q", query);
  url.searchParams.set("cc0", "1");
  url.searchParams.set("has_image", "1");
  url.searchParams.set("limit", "3");

  const payload = await json<{
    data?: {
      title?: string;
      url?: string;
      creators?: { description?: string }[];
      creation_date?: string;
      culture?: string[];
      images?: { web?: { url?: string } };
    }[];
  }>(url);

  return (payload?.data ?? []).flatMap((work) => {
    const image = work.images?.web?.url;
    if (!image) return [];
    return [
      {
        factId,
        provider: "cleveland" as const,
        query,
        title: plain(work.title, 160),
        filePage: work.url ?? "",
        imageUrl: image,
        licence: "CC0",
        licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
        author: plain(work.creators?.[0]?.description, 120),
        description: plain(
          [(work.culture ?? []).join(", "), work.creation_date]
            .filter(Boolean)
            .join(" — ")
        ),
      },
    ];
  });
}

// ————————————————————————————————————————————————————————————————————————
// Openverse — the rest of the Creative Commons web
// ————————————————————————————————————————————————————————————————————————

const OPENVERSE_LICENCES = new Set(["cc0", "pdm", "by", "by-sa"]);

async function searchOpenverse(
  factId: string,
  query: string
): Promise<Candidate[]> {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", query);
  url.searchParams.set("license", "cc0,pdm,by,by-sa");
  url.searchParams.set("page_size", "4");

  const payload = await json<{
    results?: {
      title?: string;
      url?: string;
      foreign_landing_url?: string;
      creator?: string;
      license?: string;
      license_url?: string;
      source?: string;
    }[];
  }>(url);

  return (payload?.results ?? []).flatMap((image) => {
    if (!image.url || !OPENVERSE_LICENCES.has(image.license ?? "")) return [];
    return [
      {
        factId,
        provider: "openverse" as const,
        query,
        title: plain(image.title, 160),
        filePage: image.foreign_landing_url ?? "",
        imageUrl: image.url,
        licence: (image.license ?? "").toUpperCase(),
        licenceUrl: image.license_url ?? "",
        author: plain(image.creator, 120),
        description: plain(image.source, 80),
      },
    ];
  });
}

const PROVIDERS: Record<
  Provider,
  (factId: string, query: string) => Promise<Candidate[]>
> = {
  commons: searchCommons,
  met: searchMet,
  cleveland: searchCleveland,
  openverse: searchOpenverse,
};

/** One accepted picture, as the review pass hands it back. */
interface Chosen {
  factId: string;
  file: string;
  imageUrl: string;
}

async function fetchChosen(chosen: Chosen[]): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const entry of chosen) {
    const response = await politeFetch(entry.imageUrl);
    if (!response.ok) {
      console.error(`${entry.factId}: HTTP ${response.status}`);
      continue;
    }

    const destination = join(OUTPUT_DIR, entry.file);
    mkdirSync(dirname(destination), { recursive: true });
    const resized = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: "inside" })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    writeFileSync(destination, resized);
    console.error(`${entry.file}: ${(resized.length / 1024).toFixed(0)} Ko`);
    await pause(PAUSE_MS / 3);
  }
}

async function main(): Promise<void> {
  const [mode, argument, only] = process.argv.slice(2);

  if (mode === "fetch") {
    await fetchChosen(JSON.parse(readFileSync(argument, "utf8")) as Chosen[]);
    return;
  }

  const queries = JSON.parse(readFileSync(argument, "utf8")) as {
    factId: string;
    query: string;
    providers?: Provider[];
  }[];

  const found: Candidate[] = [];
  for (const entry of queries) {
    const providers = (only ? [only as Provider] : entry.providers) ?? [
      "commons",
    ];
    for (const provider of providers) {
      try {
        found.push(...(await PROVIDERS[provider](entry.factId, entry.query)));
      } catch (error) {
        console.error(
          `${entry.factId} (${provider}): ${(error as Error).message}`
        );
      }
      await pause(PAUSE_MS);
    }
  }
  process.stdout.write(JSON.stringify(found, null, 2));
}

void main();
