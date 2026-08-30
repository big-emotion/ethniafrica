import fs from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FicheFieldList, FicheProse } from "@/components/fiche/FicheProse";
import { readFicheChapters } from "@/lib/ficheChapters";

const parchmentCss = fs.readFileSync(
  path.join(process.cwd(), "src/styles/fiche-parchment.css"),
  "utf8"
);
const peopleCss = fs.readFileSync(
  path.join(process.cwd(), "src/styles/people-tokens.css"),
  "utf8"
);

/** The declarations of one rule, so a contract reads the CSS the browser reads. */
function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, "m").exec(
    css
  );
  return match?.[2] ?? "";
}

describe("FicheProse — what the reader gets", () => {
  /**
   * The contract that keeps every existing prose assertion green: a field with
   * no markup must still render as one paragraph holding one text node, or
   * `getByText` with an exact string stops matching across the fiche suites.
   */
  // @req REQ-122
  it("renders an unmarked field as a single paragraph carrying a single text node", () => {
    const { container } = render(
      <FicheProse
        text="Le baabi était le centre des rituels."
        paragraphClassName="people-section-body"
      />
    );

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].className).toBe("people-section-body");
    expect(paragraphs[0].childNodes).toHaveLength(1);
    expect(
      screen.getByText("Le baabi était le centre des rituels.")
    ).toBeTruthy();
  });

  // @req REQ-122
  it("gives a corpus sub-heading a real level-three heading", () => {
    render(<FicheProse text={"## Rites de chefferie\nLe baabi présidait."} />);

    expect(
      screen.getByRole("heading", { level: 3, name: "Rites de chefferie" })
    ).toBeTruthy();
  });

  // @req REQ-122
  it("renders a corpus list as a list", () => {
    const { container } = render(
      <FicheProse text={"## Instruments\n- Bendir\n- Gasba"} />
    );

    expect(container.querySelectorAll("ul")).toHaveLength(1);
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  // @req REQ-122
  it("renders bold and italic runs as emphasis, never as markup characters", () => {
    const { container } = render(
      <FicheProse text="Les **Khoe-Kwadi** parlent *ǃXóõ*." />
    );

    expect(container.querySelector("strong")?.textContent).toBe("Khoe-Kwadi");
    expect(container.querySelector("em")?.textContent).toBe("ǃXóõ");
    expect(container.textContent).not.toContain("*");
  });

  /**
   * Atlas charter §7: the reading rail reads `data-fiche-section` off the
   * rendered DOM. A sub-heading inscribed there would enter the chapter count
   * and make `02 / 11` lie.
   */
  // @req REQ-122
  it("keeps its sub-headings out of the chapter rail", () => {
    const { container } = render(
      <FicheProse text={"## Rites de chefferie\nLe baabi présidait."} />
    );

    expect(container.querySelectorAll("[data-fiche-section]")).toHaveLength(0);
    expect(readFicheChapters(container)).toEqual([]);
  });

  // @req REQ-122
  it("renders nothing at all for an empty field", () => {
    const { container } = render(<FicheProse text="   " />);

    expect(container.innerHTML).toBe("");
  });
});

describe("FicheProse — a corpus defect is said, never mimed", () => {
  const serialised =
    '{"initiationRites": {"maleInitiation": "L\'initiation masculine est le rite de passage."}}';

  // @req REQ-122
  it("never prints the braces of a serialised JSON field", () => {
    const { container } = render(<FicheProse text={serialised} />);

    expect(container.textContent).not.toContain('{"');
    expect(container.textContent).not.toContain("initiationRites");
  });

  // @req REQ-122
  it("names the defect in the DOM so the page does not pass it off as prose", () => {
    const { container } = render(<FicheProse text={serialised} />);

    expect(
      container.querySelector('[data-prose-defect="serialised-json"]')
    ).toBeTruthy();
  });

  // @req REQ-122
  it("still renders the prose when a marker is left unpaired", () => {
    const { container } = render(
      <FicheProse text="Un **gras qui ne ferme pas." />
    );

    expect(container.textContent).toContain("gras qui ne ferme pas.");
  });
});

describe("FicheFieldList — the label is a term, not a section", () => {
  const fields = [
    { label: "Typologie", prose: "Langues agglutinantes." },
    { label: "Traits phonologiques", prose: "## Clics\nDouble occlusion." },
  ];

  /**
   * The `term` role takes no accessible name from its content, so the label is
   * read off the element rather than queried by name.
   */
  // @req REQ-122
  it("pairs every label with its value as a term and a definition", () => {
    render(<FicheFieldList fields={fields} />);

    expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual([
      "Typologie",
      "Traits phonologiques",
    ]);
    expect(screen.getAllByRole("definition")).toHaveLength(2);
  });

  /**
   * There is one heading level under the chapter's `h2`, and the corpus needs
   * it. A field label that took the `h3` would leave the corpus nowhere to go —
   * and would claim a place in the document outline it does not hold.
   */
  // @req REQ-122
  it("leaves the only available heading level to the corpus", () => {
    render(<FicheFieldList fields={fields} />);

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual(["Clics"]);
  });

  // @req REQ-122
  it("omits a field the corpus does not fill", () => {
    render(
      <FicheFieldList fields={[...fields, { label: "Vide", prose: "" }]} />
    );

    expect(screen.getAllByRole("term").map((t) => t.textContent)).not.toContain(
      "Vide"
    );
    expect(screen.getAllByRole("term")).toHaveLength(2);
  });

  // @req REQ-122
  it("carries a language tag on the value it qualifies", () => {
    const { container } = render(
      <FicheFieldList
        fields={[{ label: "Auto-appellation", prose: "Yorùbá", lang: "yo" }]}
      />
    );

    expect(container.querySelector("dd")?.getAttribute("lang")).toBe("yo");
  });
});

describe("the stylesheet holds what ESLint cannot lint", () => {
  // @req REQ-122
  it("dresses a sub-heading in the h3 role, size and leading together", () => {
    const body = ruleBody(parchmentCss, ".afh-prose-heading");

    expect(body).toContain("var(--afh-text-h3)");
    expect(body).toContain("var(--afh-leading-h3)");
    expect(body).not.toMatch(/font-size:\s*\d/);
  });

  // @req REQ-122
  it("dresses a field term in the eyebrow role rather than at body size", () => {
    const body = ruleBody(parchmentCss, ".afh-prose-term");

    expect(body).toContain("var(--afh-text-eyebrow)");
    expect(body).toContain("var(--afh-eyebrow-transform)");
    expect(body).toContain("var(--afh-eyebrow-tracking)");
  });

  /**
   * The browser indents a `dd` by 40px, which would push every value out of
   * line with its own term and with the rest of the chapter.
   */
  // @req REQ-122
  it("cancels the user-agent indent on a definition", () => {
    expect(ruleBody(parchmentCss, ".afh-prose-def")).toMatch(
      /margin-inline-start:\s*0/
    );
  });

  // @req REQ-122
  it("gives the prose list a real marker, unlike the parchment's structural lists", () => {
    const body = ruleBody(parchmentCss, ".afh-prose-list");

    expect(body).toMatch(/list-style:\s*(?!none)/);
  });

  /**
   * Atlas charter §2: a component never names an accent, it reads the one its
   * surface scopes.
   */
  // @req REQ-122
  it("names no colour of its own anywhere in the prose block", () => {
    const block = parchmentCss.slice(
      parchmentCss.indexOf(".afh-prose-heading")
    );
    const proseRules = block.slice(0, block.indexOf("\n.afh-stat"));

    expect(proseRules).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(proseRules).not.toMatch(/\b(rgb|hsl)a?\(/);
  });

  /**
   * The people fiche is on the same parchment as the family and the country,
   * and `ficheParchmentLayout` already holds that the parchment decides where a
   * line ends. Its prose was the one paragraph still stopping mid-width while
   * the stat cards and tags beside it ran to both edges.
   */
  // @req REQ-122
  it("lets the people fiche prose fill the parchment like every other surface", () => {
    expect(ruleBody(peopleCss, ".people-section-body")).not.toMatch(
      /max-width/
    );
  });
});
