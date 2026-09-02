import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DID_YOU_KNOW_FACTS } from "@/lib/home/didYouKnowFacts";
import {
  DID_YOU_KNOW_ILLUSTRATIONS,
  illustrationFor,
} from "@/lib/home/didYouKnowIllustrations";

const PUBLIC_DIR = join(process.cwd(), "public");

/**
 * The pictures are held to the same standard as the sources.
 *
 * An illustration is a citation with a frame around it: it asserts « this is
 * what that was », and a reader who cannot see who made it, when, and under
 * what licence has no way to check the assertion. These tests hold the three
 * things that would otherwise rot silently — a file that stopped existing, a
 * credit that never named a licence, and an alt that only repeats the
 * headline a screen reader has already been read.
 */
describe("Anecdote illustrations — a picture that cites itself (REQ-113)", () => {
  // @req REQ-113
  it("gives every fact in the bank a picture", () => {
    const missing = DID_YOU_KNOW_FACTS.filter(
      (fact) => !illustrationFor(fact.id)
    ).map((fact) => fact.id);

    expect(missing).toEqual([]);
  });

  // @req REQ-113
  it("points every picture at a file the repo actually ships", () => {
    const absent = Object.entries(DID_YOU_KNOW_ILLUSTRATIONS)
      .filter(
        ([, picture]) =>
          picture.kind === "picture" &&
          !existsSync(join(PUBLIC_DIR, picture.src))
      )
      .map(([id]) => id);

    expect(absent).toEqual([]);
  });

  // CC BY-SA is only satisfied when the credit is visible in the page, so a
  // credit that names no licence is a licence breach, not a typo.
  // @req REQ-113
  it("names a licence in every credit line", () => {
    const uncredited = Object.entries(DID_YOU_KNOW_ILLUSTRATIONS)
      .filter(
        ([, picture]) =>
          picture.kind === "picture" &&
          !/CC |domaine public|CC0/.test(picture.credit)
      )
      .map(([id]) => id);

    expect(uncredited).toEqual([]);
  });

  // @req REQ-113
  it("describes what the picture shows rather than repeating the headline", () => {
    const echoes = DID_YOU_KNOW_FACTS.filter((fact) => {
      const picture = illustrationFor(fact.id);
      return picture ? picture.alt === fact.headline : false;
    }).map((fact) => fact.id);

    expect(echoes).toEqual([]);
    for (const picture of Object.values(DID_YOU_KNOW_ILLUSTRATIONS)) {
      expect(picture.alt.length).toBeGreaterThan(20);
    }
  });

  // A plate exists to show the two names. One that repeats the same word
  // twice, or leaves either side blank, shows nothing and should have been a
  // photograph or nothing at all.
  // @req REQ-113
  it("gives every drawn plate two different names and an origin", () => {
    const hollow = Object.entries(DID_YOU_KNOW_ILLUSTRATIONS)
      .filter(([, illustration]) => illustration.kind === "plate")
      .filter(([, plate]) => {
        if (plate.kind !== "plate") return false;
        return (
          plate.given.trim() === "" ||
          plate.own.trim() === "" ||
          plate.givenBy.trim() === "" ||
          plate.given.trim() === plate.own.trim()
        );
      })
      .map(([id]) => id);

    expect(hollow).toEqual([]);
  });

  // @req REQ-113
  it("has no picture left over from a fact the bank no longer holds", () => {
    const known = new Set(DID_YOU_KNOW_FACTS.map((fact) => fact.id));
    const orphans = Object.keys(DID_YOU_KNOW_ILLUSTRATIONS).filter(
      (id) => !known.has(id)
    );

    expect(orphans).toEqual([]);
  });
});
