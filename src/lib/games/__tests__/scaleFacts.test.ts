import { describe, expect, it } from "vitest";

import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";
import { mercatorInflation } from "@/lib/games/sphericalArea";
import { WORLD_COMPARE } from "@/lib/atlas/assets/worldCompare";
import { LANDMARKS } from "@/lib/games/landmarks";
import {
  SCALE_FACT_PROVENANCE_PATHS,
  buildScaleFacts,
  pickScaleFacts,
} from "@/lib/games/scaleFacts";
import { revealProvenanceFr } from "@/lib/games/revealProvenance";

const facts = buildScaleFacts();

describe("buildScaleFacts", () => {
  // @req REQ-120
  it("states enough facts to carry a session without repeating", () => {
    expect(facts.length).toBeGreaterThanOrEqual(8);
  });

  // @req REQ-120
  it("gives every fact a unique id", () => {
    const ids = facts.map((fact) => fact.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * The whole reason this bank is computed rather than typed: a figure copied
   * from a web page drifts away from the outlines the globe actually draws,
   * and the reader is shown one number over a picture of another.
   */
  // @req REQ-120
  it("puts a measured figure in every headline", () => {
    for (const fact of facts) {
      expect(fact.headlineFr).toMatch(/\d/);
    }
  });

  // @req REQ-120
  it("names a provenance the reveal can word in French", () => {
    for (const fact of facts) {
      expect(SCALE_FACT_PROVENANCE_PATHS).toContain(fact.fieldPath);
      expect(revealProvenanceFr(fact.fieldPath)).toBeTruthy();
    }
  });

  // @req REQ-120
  it("writes prose, not a template with a hole left in it", () => {
    for (const fact of facts) {
      expect(fact.headlineFr).not.toMatch(/undefined|NaN|\{\{/);
      expect(fact.bodyFr).not.toMatch(/undefined|NaN|\{\{/);
      expect(fact.bodyFr.length).toBeGreaterThan(40);
    }
  });

  /**
   * The fact the page exists for. Africa is fourteen times Greenland, and
   * Mercator draws Greenland at fourteen times its own size — two different
   * fourteens, which is exactly why the misperception is so complete.
   */
  // @req REQ-120
  it("carries the Greenland comparison", () => {
    const greenland = facts.find((fact) => fact.id === "afrique-groenland");
    expect(greenland).toBeDefined();
    expect(greenland.headlineFr).toContain("14");
    expect(greenland.headlineFr).toContain("Groenland");
  });

  // @req REQ-120
  it("compares distances a French reader already owns", () => {
    const width = facts.find((fact) => fact.id === "largeur-afrique");
    expect(width).toBeDefined();
    expect(width.bodyFr).toContain("Pékin");
  });
});

describe("pickScaleFacts", () => {
  // @req REQ-120
  it("returns the number asked for, without repeating one", () => {
    const picked = pickScaleFacts(3, 7);
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((fact) => fact.id)).size).toBe(3);
  });

  // @req REQ-120
  it("is deterministic for one seed, so a render is reproducible", () => {
    expect(pickScaleFacts(3, 42).map((fact) => fact.id)).toEqual(
      pickScaleFacts(3, 42).map((fact) => fact.id)
    );
  });

  // @req REQ-120
  it("gives different seeds different openings", () => {
    const seeds = [0, 1, 2, 3, 4, 5].map(
      (seed) => pickScaleFacts(1, seed)[0].id
    );
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });

  // @req REQ-120
  it("never invents a fact when asked for more than the bank holds", () => {
    expect(pickScaleFacts(facts.length + 5, 0)).toHaveLength(facts.length);
  });
});

describe("landmarks", () => {
  // @req REQ-120
  it("keeps every coordinate on the globe", () => {
    for (const landmark of Object.values(LANDMARKS)) {
      expect(Math.abs(landmark.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(landmark.lon)).toBeLessThanOrEqual(180);
    }
  });

  // @req REQ-120
  it("names every landmark in French", () => {
    for (const landmark of Object.values(LANDMARKS)) {
      expect(landmark.nameFr.length).toBeGreaterThan(1);
    }
  });
});

describe("the assets the facts are measured from", () => {
  /**
   * `tunisie-groenland` states in prose that Tunisia is the African shape the
   * projection stretches most. Prose cannot be checked by the type system, so
   * it is checked here: re-simplify the outlines, or add a territory further
   * north, and this fails rather than leaving the page asserting something
   * the geometry stopped supporting.
   */
  // @req REQ-120
  it("still makes Tunisia the most inflated African outline", () => {
    const mostInflated = Object.entries(AFRICA_ADMIN0)
      .map(([id, country]) => ({
        id,
        inflation: mercatorInflation(
          country.rings
            .map((ring) => ring.map(([lon, lat]) => ({ lon, lat })))
            .reduce((largest, ring) =>
              ring.length > largest.length ? ring : largest
            )
        ),
      }))
      .sort((a, b) => b.inflation - a.inflation)[0];

    expect(mostInflated.id).toBe("TUN");
  });

  // A fact naming a shape the asset does not hold would render as prose with
  // a hole in it, which the bank's own test above cannot distinguish from a
  // fact about a shape whose area happens to be zero.
  // @req REQ-120
  it("holds every shape the bank compares", () => {
    for (const id of ["GRL", "USA", "CHN", "IND", "EUW"]) {
      expect(WORLD_COMPARE[id]).toBeDefined();
    }
    for (const id of ["COD", "TUN"]) {
      expect(AFRICA_ADMIN0[id]).toBeDefined();
    }
  });
});
