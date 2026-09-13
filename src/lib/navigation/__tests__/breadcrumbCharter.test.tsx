import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { deriveTrail } from "@/lib/navigation/deriveTrail";
import { AfrikBreadcrumbs } from "@/components/layout/AfrikBreadcrumbs";
import { FicheTileChapter } from "@/components/fiche/FicheTileChapter";
import { peopleLanguageTiles } from "@/lib/fiche/languages";
import {
  PAGE_TYPES,
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getPeopleLinksRoute,
  getPeopleRoute,
} from "@/lib/routing";
import { YORUBA } from "@/components/fiche/__tests__/ficheContextFixtures";
import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";

/**
 * The trail's contract, in one file so the rule and its consequences stay
 * readable together.
 *
 * The rule: a trail is *derived* from the path the reader is on, never
 * assembled by hand at the call site. Five call sites each wrote their own
 * hierarchy, which is how the people fiche came to open on "Familles" while
 * the country fiche opened on a people — provenance dressed up as ancestry.
 *
 * Its corollary, and the reason this file asserts absences as often as
 * presences: never print a segment you cannot name. A raw `PPL_YORUBA` or
 * `BEN` in a crumb is worse than a shorter trail, because it looks like a
 * label and reads like debris.
 */

describe("deriveTrail — the trail comes from the route", () => {
  /**
   * The axis crumb names the access mode the page sits under and opens it.
   *
   * It pointed nowhere between ETNI-1555 and 7 September 2026, while the three
   * axis landing pages did not exist — the atlas charter called it a
   * non-navigating heading for exactly as long as that was true. The hubs came
   * back on the spread of brand charter §8.6, and a crumb that names a page
   * the site serves and refuses to open it is the worse of the two shapes.
   */
  // @req REQ-114
  it("opens on the home and links the axis to its hub", () => {
    expect(deriveTrail(getLocalizedRoute("fr", "countries"))).toEqual([
      { label: "Accueil", href: "/fr" },
      {
        label: ACCESS_MODE_LABELS.atlas,
        href: getLocalizedRoute("fr", "atlasHub"),
      },
      { label: "Pays" },
    ]);
  });

  /**
   * `Accueil › Explorer › Explorer` would name the same place twice, and the
   * charter already rules on that shape: a level offering no choice is not a
   * level.
   */
  // @req REQ-091
  it("does not repeat the axis on the axis hub itself", () => {
    expect(deriveTrail(getLocalizedRoute("fr", "atlasHub"))).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: ACCESS_MODE_LABELS.atlas },
    ]);
  });

  /**
   * A page no axis leads to still gets a way home. Two crumbs, honest about
   * being an escape hatch rather than a hierarchy — inventing a parent for the
   * legal pages would be inventing a claim about the site's shape.
   */
  // @req REQ-091
  it("gives a page outside the three axes the home and itself, nothing more", () => {
    expect(deriveTrail(getLocalizedRoute("fr", "compare"))).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: "Comparer" },
    ]);
  });

  // @req REQ-091
  it("gives every page type a crumb, so no route trails off unnamed", () => {
    for (const page of PAGE_TYPES) {
      const trail = deriveTrail(getLocalizedRoute("fr", page));

      // Home, optionally the axis, then the page itself.
      expect(trail.length).toBeGreaterThanOrEqual(2);
      expect(trail[0]).toEqual({ label: "Accueil", href: "/fr" });
      for (const crumb of trail) {
        expect(crumb.label.length).toBeGreaterThan(0);
      }
      // The reader stands on the last one.
      expect(trail[trail.length - 1].href).toBeUndefined();
    }
  });

  // @req REQ-091
  it("opens a fiche's trail on its own hub, at the route the slug table gives", () => {
    expect(deriveTrail(getCountryRoute("fr", "BEN"), "Bénin")).toEqual([
      { label: "Accueil", href: "/fr" },
      {
        label: ACCESS_MODE_LABELS.atlas,
        href: getLocalizedRoute("fr", "atlasHub"),
      },
      { label: "Pays", href: getLocalizedRoute("fr", "countries") },
      { label: "Bénin" },
    ]);
    expect(deriveTrail(getFamilyRoute("fr", "FLG_KHOE"), "Khoe-Kwadi")).toEqual(
      [
        { label: "Accueil", href: "/fr" },
        {
          label: ACCESS_MODE_LABELS.atlas,
          href: getLocalizedRoute("fr", "atlasHub"),
        },
        { label: "Familles", href: getLocalizedRoute("fr", "families") },
        { label: "Khoe-Kwadi" },
      ]
    );
  });

  // @req REQ-091
  it("names a sub-route below a fiche and keeps the fiche reachable", () => {
    expect(
      deriveTrail(getPeopleLinksRoute("fr", "PPL_YORUBA"), "Yoruba")
    ).toEqual([
      { label: "Accueil", href: "/fr" },
      {
        label: ACCESS_MODE_LABELS.atlas,
        href: getLocalizedRoute("fr", "atlasHub"),
      },
      { label: "Peuples", href: getLocalizedRoute("fr", "peoples") },
      { label: "Yoruba", href: getPeopleRoute("fr", "PPL_YORUBA") },
      { label: "Liens" },
    ]);
  });

  // @req REQ-091
  it("stops rather than print an identifier it was given no label for", () => {
    const trail = deriveTrail(getCountryRoute("fr", "BEN"));

    expect(trail).toEqual([
      { label: "Accueil", href: "/fr" },
      {
        label: ACCESS_MODE_LABELS.atlas,
        href: getLocalizedRoute("fr", "atlasHub"),
      },
      { label: "Pays", href: getLocalizedRoute("fr", "countries") },
    ]);
    expect(JSON.stringify(trail)).not.toContain("BEN");
  });

  // @req REQ-091
  it("stops at the first segment it has no words for", () => {
    const trail = deriveTrail(
      `${getPeopleRoute("fr", "PPL_YORUBA")}/tresor-cache`,
      "Yoruba"
    );

    expect(trail.map((crumb) => crumb.label)).toEqual([
      "Accueil",
      ACCESS_MODE_LABELS.atlas,
      "Peuples",
      "Yoruba",
    ]);
    expect(JSON.stringify(trail)).not.toContain("tresor-cache");
  });

  /**
   * This assertion used to read "returns no trail at all for a path outside
   * the slug table", and a page outside `PageType` — every legal notice, the
   * whole account subtree — therefore rendered nothing. That was the trail
   * agreeing with itself and disagreeing with the site: those routes exist,
   * readers land on them, and the one thing a trail owes them is the way
   * back. So an unrecognised path keeps the home crumb and stops there,
   * rather than collapsing to nothing.
   *
   * What still returns nothing is a path with no language to open on: there
   * is no home to point at, and inventing `/fr` for `/de/pays` would send the
   * reader somewhere they did not ask to go.
   */
  // @req REQ-091
  it("gives an unrecognised path the way home and nothing it cannot name", () => {
    expect(deriveTrail("/fr/nulle-part")).toEqual([
      { label: "Accueil", href: "/fr" },
    ]);
    expect(JSON.stringify(deriveTrail("/fr/nulle-part"))).not.toContain(
      "nulle-part"
    );
  });

  // @req REQ-091
  it("returns no trail for a path with no language to open on", () => {
    expect(deriveTrail("/de/pays")).toEqual([]);
    expect(deriveTrail("/")).toEqual([]);
  });

  /**
   * The home is the one page whose trail is a single crumb. It is still a
   * trail: the reader stands on it, so it carries `aria-current` and no href,
   * exactly like the last crumb of any other route.
   */
  // @req REQ-091
  it("gives the home itself one crumb, with no link out", () => {
    expect(deriveTrail("/fr")).toEqual([{ label: "Accueil" }]);
  });

  /**
   * The pages `PageType` deliberately ignores — legal notices, account and
   * admin screens — are named from the segment table instead, so every one of
   * them gets a trail without widening the union that means "an addressable
   * resource of the corpus".
   */
  // @req REQ-091
  it("names a page the slug table does not address, segment by segment", () => {
    expect(deriveTrail("/fr/mentions-legales")).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: "Mentions légales" },
    ]);
    expect(deriveTrail("/fr/admin/connexion")).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: "Administration", href: "/fr/admin" },
      { label: "Connexion" },
    ]);
  });

  /**
   * `entityLabel` is spent on the first segment the table cannot name,
   * wherever in the path it falls — the rule that lets one argument serve a
   * fiche identifier, a game slug and a report reference alike.
   */
  // @req REQ-091
  it("spends the entity label on the identifier, not on a fixed position", () => {
    expect(
      deriveTrail("/fr/signalements/RPT_12", "Signalement RPT_12")
    ).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: "Signalements", href: "/fr/signalements" },
      { label: "Signalement RPT_12" },
    ]);
    expect(
      deriveTrail(
        `${getLocalizedRoute("fr", "jeuxHub")}/mercator`,
        "La taille qu'on vous a cachée"
      )
    ).toEqual([
      { label: "Accueil", href: "/fr" },
      {
        label: ACCESS_MODE_LABELS.jeux,
        href: getLocalizedRoute("fr", "jeuxHub"),
      },
      { label: "La taille qu'on vous a cachée" },
    ]);
  });

  /**
   * A sub-route the table already names must not eat the entity label: the
   * quiz score is `Score`, and the label — if one is passed at all — is still
   * available for an identifier further along.
   */
  // @req REQ-091
  it("names a known sub-route from the table rather than the entity label", () => {
    expect(deriveTrail(`${getLocalizedRoute("fr", "quiz")}/score`)).toEqual([
      { label: "Accueil", href: "/fr" },
      {
        label: ACCESS_MODE_LABELS.jeux,
        href: getLocalizedRoute("fr", "jeuxHub"),
      },
      { label: "Quiz", href: getLocalizedRoute("fr", "quiz") },
      { label: "Score" },
    ]);
  });

  // @req REQ-091
  it("carries the identifier through verbatim, encoding included", () => {
    const trail = deriveTrail(getPeopleLinksRoute("fr", "PPL_%2F%2Fevil"), "X");

    const fiche = trail.find((crumb) => crumb.label === "X");
    expect(trail.at(-2)?.href).toBe(getPeopleRoute("fr", "PPL_%2F%2Fevil"));
    expect(fiche).toBeDefined();
  });
});

describe("the trail a fiche renders", () => {
  // @req REQ-115
  it("marks the last crumb as where the reader is, and links the rest", () => {
    render(
      <AfrikBreadcrumbs
        items={deriveTrail(getCountryRoute("fr", "BEN"), "Bénin")}
      />
    );

    expect(
      screen.getByRole("link", { name: "Pays" }).getAttribute("href")
    ).toBe(getLocalizedRoute("fr", "countries"));
    expect(screen.getByText("Bénin").getAttribute("aria-current")).toBe("page");
  });

  /**
   * Exactly one crumb renders without an href, and it is the one the reader
   * stands on. The axis crumb was the second such crumb until 7 September 2026
   * and meant the opposite thing — a heading with nowhere to go — which is why
   * `aria-current` had to be withheld from it by name. It is a link again, so
   * the rule reduces to its real form: `aria-current` belongs to the last
   * crumb and to no other, or a screen reader is told the page is in two
   * places at once.
   */
  // @req REQ-114
  it("marks only the reader's own crumb as current", () => {
    render(
      <AfrikBreadcrumbs
        items={deriveTrail(getCountryRoute("fr", "BEN"), "Bénin")}
      />
    );

    const axis = screen.getByRole("link", { name: ACCESS_MODE_LABELS.atlas });
    expect(axis).toHaveAttribute("href", getLocalizedRoute("fr", "atlasHub"));
    expect(axis.getAttribute("aria-current")).toBeNull();

    const current = screen
      .getByRole("navigation")
      .querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Bénin");
  });

  /**
   * The consequence the owner accepted when the trail became derived: a
   * people's family is no longer an ancestor in the URL, so it is no longer a
   * crumb. It must not therefore vanish from the page.
   *
   * What carries it has changed hands — it was the context triad above the
   * chapters, and the chapters are gone; it is now the parchment's own
   * "Famille linguistique" field. The assertion is the same one either way,
   * because the guarantee is about the fiche, not about the component: from a
   * people, the family is one click away.
   */
  // @req REQ-091
  it("keeps the family reachable from a people fiche once the crumb is gone", () => {
    expect(
      deriveTrail(getPeopleRoute("fr", "PPL_YORUBA"), "Yoruba").map(
        (crumb) => crumb.label
      )
    ).toEqual(["Accueil", ACCESS_MODE_LABELS.atlas, "Peuples", "Yoruba"]);

    const { container } = render(
      <FicheTileChapter
        tiles={peopleLanguageTiles(
          {
            languageFamilyId: YORUBA.languageFamilyId,
            languageFamilyName: "Niger-Congo",
            isoCodes: [],
            dialects: [],
          },
          "Niger-Congo",
          "fr"
        )}
        language="fr"
      />
    );

    const familyLink = container.querySelector("a");
    expect(familyLink?.getAttribute("href")).toBe(
      getFamilyRoute("fr", YORUBA.languageFamilyId)
    );
    expect(familyLink?.textContent).toBe("Niger-Congo");
  });
});

describe("the trail the home does not render", () => {
  /**
   * The home is the one route whose derived trail holds a single crumb, and
   * that crumb is the home itself, marked as where the reader stands. It names
   * no ancestor and offers no way back, so it prints a lone "Accueil" over the
   * page whose whole job is to be the accueil — chrome that asserts nothing.
   */
  // @req REQ-115
  it("renders nothing when no crumb leads anywhere but here", () => {
    expect(deriveTrail("/fr")).toEqual([{ label: "Accueil" }]);

    const { container } = render(
      <AfrikBreadcrumbs items={deriveTrail("/fr")} />
    );

    expect(container.firstChild).toBeNull();
  });

  /**
   * The rule is "no way back", not "one crumb". A path the segment table runs
   * out of words for keeps its home crumb *with* its href, because the reader
   * is somewhere further down and that link is the only way out.
   */
  // @req REQ-115
  it("still renders a lone crumb that is a way out", () => {
    render(<AfrikBreadcrumbs items={[{ label: "Accueil", href: "/fr" }]} />);

    expect(screen.getByRole("link", { name: "Accueil" })).toBeDefined();
  });
});
