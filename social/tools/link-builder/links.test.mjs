/**
 * The tagging scheme is a contract with Plausible, not a formatting
 * preference: a parameter renamed, reordered under a different key, or dropped
 * makes the visit indistinguishable from Direct traffic, and the video that
 * earned it becomes unmeasurable after the fact. So the shape is asserted here
 * rather than trusted to whoever edits the builder next.
 *
 *   node --test
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  NETWORKS,
  ROOT_FALLBACK_TITLE,
  buildLinks,
  campaignSlugOf,
  judge,
  tag,
  titleOf,
} from "./links.mjs";

test("tags a fiche path with the four parameters, in the scheme's order", () => {
  assert.equal(
    tag("/fr/atlas/noms/PAT_TRAORE", "youtube", "traore-diop", "video"),
    "https://ethniafrica.com/fr/atlas/noms/PAT_TRAORE" +
      "?utm_source=youtube&utm_medium=social" +
      "&utm_campaign=traore-diop&utm_content=video"
  );
});

test("carries one campaign slug across every network", () => {
  const links = buildLinks({
    path: "/fr/atlas/noms/PAT_TRAORE",
    campaign: "traore-diop",
  });
  const campaigns = new Set(
    links.map((l) => new URL(l.url).searchParams.get("utm_campaign"))
  );
  assert.deepEqual([...campaigns], ["traore-diop"]);
});

test("covers the five networks plus the story and the pinned comment", () => {
  const links = buildLinks({
    path: "/fr/atlas/noms/PAT_TRAORE",
    campaign: "traore-diop",
  });
  assert.deepEqual(
    links.map((l) => `${l.network}/${l.content}`),
    [
      ...NETWORKS.map((n) => `${n}/video`),
      "instagram/story",
      "youtube/commentaire-epingle",
    ]
  );
});

test("names the format the piece actually is, not always a video", () => {
  const links = buildLinks({
    path: "/fr/jeux/mercator",
    campaign: "mercator-proportions",
    content: "carrousel",
  });
  assert.equal(
    new URL(links[0].url).searchParams.get("utm_content"),
    "carrousel"
  );
});

test("refuses a path that is not a site path", () => {
  assert.throws(
    () => tag("ethniafrica.com/fr", "youtube", "x", "video"),
    /must start with/
  );
});

test("refuses a campaign slug the five networks could spell differently", () => {
  // A slug carrying a capital, a space or an accent is one the operator retypes
  // by hand on the fifth network, and the comparison silently splits in two.
  for (const spelling of ["Traoré Diop", "traore_diop ", "TRAORE"]) {
    assert.throws(() => tag("/fr", "youtube", spelling, "video"), /slug/);
  }
});

test("derives a campaign slug from a title, deterministically", () => {
  assert.equal(
    campaignSlugOf("Un Traoré du Mali peut devenir un Diop au Sénégal."),
    "un-traore-du-mali-peut-devenir-un-diop-au-senegal"
  );
});

test("reads the rendered title, entities and all", () => {
  assert.equal(
    titleOf(
      "<head><title>EthniAfrica | Dictionnaire des Ethnies d&#x27;Afrique</title></head>"
    ),
    ROOT_FALLBACK_TITLE
  );
});

test("refuses a fiche that answers 200 with the site's default title", () => {
  // Measured on production 2026-09-09: a missing identifier is a soft 404, so
  // the status says nothing about the fiche and the title says everything.
  const verdict = judge({
    status: 200,
    landedOn:
      "https://ethniafrica.com/fr/atlas/noms/PAT_NEXISTEPAS?utm_campaign=x",
    title: ROOT_FALLBACK_TITLE,
  });
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /n'existe pas/);
});

test("refuses a page that answered but arrived stripped of its tagging", () => {
  const verdict = judge({
    status: 200,
    landedOn: "https://ethniafrica.com/fr/atlas/pays/BEN",
    title: "Bénin — peuples et langues | EthniAfrica",
  });
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /sans le balisage/);
});

test("accepts a fiche that answers with a title of its own", () => {
  const verdict = judge({
    status: 200,
    landedOn:
      "https://ethniafrica.com/fr/atlas/noms/PAT_TRAORE?utm_campaign=traore-diop",
    title: "Traore — origine et histoire du nom | EthniAfrica",
  });
  assert.equal(verdict.ok, true);
});
