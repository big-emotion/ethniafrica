/**
 * QUARANTINED, and for one reason only: no dossier fiche is published yet.
 *
 * Every assertion below reads dataset/source/afrik/dossiers/, which this branch
 * has not written to — the research is collected but its `uncorroborated` lists
 * have not been worked through, and publishing a chapter that rests on a single
 * source would be the corpus contradicting its own doctrine to make a suite go
 * green. See docs/editorial/dossiers-realites/README.md.
 *
 * **What un-quarantines it: the first DOS_*.json landing in that directory.**
 * Move this file up one level then; nothing in it needs changing. It is
 * deliberately not written to skip on an empty corpus, because a suite that
 * passes when it checked nothing is the failure mode this repository has a
 * whole class of scar tissue about.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DossierPage } from "@/components/dossiers/DossierPage";
import { parseDossierFile } from "@/lib/afrik/parsers/dossierParser";
import type { Dossier } from "@/lib/afrik/parsers/dossierTypes";
import { getModulesForAccessMode } from "@/lib/hubs/moduleRegistry";
import { getLocalizedRoute } from "@/lib/routing";

vi.mock("next/navigation", () => ({
  usePathname: () => "/fr",
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    title,
    subtitle,
  }: {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));

const CORPUS_ROOT = resolve(process.cwd(), "dataset/source/afrik/dossiers");
const STYLESHEET = resolve(process.cwd(), "src/styles/dossier.css");

function publishedDossiers(): Dossier[] {
  return readdirSync(CORPUS_ROOT)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const parsed = parseDossierFile(
        JSON.parse(readFileSync(resolve(CORPUS_ROOT, name), "utf8"))
      );
      if (!parsed.data) {
        throw new Error(`${name} does not parse: ${parsed.errors.join("; ")}`);
      }
      return parsed.data;
    });
}

describe("the dossier template — charter contract", () => {
  const dossiers = publishedDossiers();

  // @req REQ-114
  it("publishes at least one dossier of the Réalités vertical", () => {
    expect(
      dossiers.filter((dossier) => dossier.vertical === "realites").length
    ).toBeGreaterThan(0);
  });

  // Brand charter §5.2: a page has one accent, set once, and it is the axis's.
  // Three dossiers are three pages of the same kind, so all three take the
  // Dossiers teal rather than rotating through the palette.
  // @req REQ-113
  it("scopes each dossier page to exactly one accent, and it is the same one", () => {
    for (const dossier of dossiers) {
      const { container } = render(
        <DossierPage dossier={dossier} language="fr" />
      );
      const wrappers = container.querySelectorAll("[class*='afh-accent-']");

      expect(wrappers).toHaveLength(1);
      expect(wrappers[0].className).toContain("afh-accent-teal");
    }
  });

  // The rule the entity exists for. A chapter that renders one reading is a
  // chapter that publishes an authoritative account with nothing beside it.
  // @req REQ-114
  it("renders both readings of every chapter of every dossier", () => {
    for (const dossier of dossiers) {
      render(<DossierPage dossier={dossier} language="fr" />);

      for (const chapter of dossier.chapters) {
        const readings = screen.getByTestId(
          `dossier-readings-${chapter.chapterKey}`
        );

        expect(
          readings.querySelectorAll('[data-stance="official"]')
        ).toHaveLength(1);
        expect(
          readings.querySelectorAll('[data-stance="counter"]').length
        ).toBeGreaterThanOrEqual(1);
      }
    }
  });

  // The authoritative account is stated first, whole. A reader who meets the
  // widening before the thing being widened has been handed a rebuttal to an
  // argument nobody made.
  // @req REQ-114
  it("states the authoritative reading before the counter-reading", () => {
    const dossier = dossiers[0];
    render(<DossierPage dossier={dossier} language="fr" />);

    const readings = screen.getByTestId(
      `dossier-readings-${dossier.chapters[0].chapterKey}`
    );
    const stances = Array.from(readings.children).map((child) =>
      child.getAttribute("data-stance")
    );

    expect(stances[0]).toBe("official");
    expect(stances).toContain("counter");
  });

  // Typography charter §3: divergence between a heading and a non-heading is
  // legitimate; between two headings it is a lie. A reading is an item of the
  // chapter above it, so it sits one rung down and never competes with the
  // chapter titles that govern it.
  // @req REQ-113
  it("keeps every reading one rung below the chapter that carries it", () => {
    const dossier = dossiers[0];
    render(<DossierPage dossier={dossier} language="fr" />);

    for (const chapter of dossier.chapters) {
      const readings = screen.getByTestId(
        `dossier-readings-${chapter.chapterKey}`
      );

      expect(
        within(readings).queryAllByRole("heading", { level: 2 })
      ).toHaveLength(0);
      expect(
        within(readings).getAllByRole("heading", { level: 3 }).length
      ).toBeGreaterThan(0);
    }
  });

  // Brand charter §9: a licence is published, not named. Where a picture's
  // licence requires attribution, the rendered caption carries the author and
  // the licence's address — not its initials.
  // @req REQ-114
  it("publishes the address of every attributed licence it names", () => {
    for (const dossier of dossiers) {
      const { container } = render(
        <DossierPage dossier={dossier} language="fr" />
      );

      for (const chapter of dossier.chapters) {
        const illustration = chapter.illustration;
        if (!illustration || !/^cc\s*by/i.test(illustration.licence)) continue;

        const caption = container.querySelector(
          `#${chapter.chapterKey} figcaption`
        );

        expect(caption?.textContent).toContain(illustration.author ?? "");
        expect(
          caption?.querySelector(`a[href="${illustration.licenceUrl}"]`)
        ).not.toBeNull();
      }
    }
  });

  // Every dossier the menu offers has to resolve to the address the corpus
  // declares. The registry holds where a dossier lives and the fiche holds
  // what it says; nothing else keeps the two agreeing.
  // @req REQ-114
  it("gives every registered Réalités module the slug its fiche declares", () => {
    const slugs = new Set(dossiers.map((dossier) => dossier.slug));
    const registered = getModulesForAccessMode("dossiers").filter((entry) =>
      entry.id.startsWith("dossier-")
    );

    expect(registered.length).toBeGreaterThan(0);

    for (const entry of registered) {
      const route = getLocalizedRoute("fr", entry.page!);
      const slug = route.split("/").pop()!;

      expect(slugs.has(slug)).toBe(true);
    }
  });

  // Brand charter §8.1: running prose of more than two lines is never centred,
  // and mobile-text.css centres text site-wide below 768 px. Every prose block
  // in this sheet therefore declares its own alignment rather than inheriting.
  // @req REQ-113
  it("declares the alignment of every prose block in the stylesheet", () => {
    const sheet = readFileSync(STYLESHEET, "utf8");

    for (const selector of [
      ".afh-dossier-standfirst",
      ".afh-dossier-prose p",
      ".afh-dossier-reading",
      ".afh-dossier-source",
    ]) {
      const block = sheet.slice(sheet.indexOf(`${selector} {`));

      expect(block.slice(0, block.indexOf("}"))).toContain("text-align: left");
    }
  });

  // Brand charter §4: --afh-* is the spine, and a colour belongs in a token.
  // A hex literal in this sheet is a colour that no palette governs.
  // @req REQ-113
  it("paints from tokens, never from a literal", () => {
    const sheet = readFileSync(STYLESHEET, "utf8");
    const withoutComments = sheet.replace(/\/\*[\s\S]*?\*\//g, "");

    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
