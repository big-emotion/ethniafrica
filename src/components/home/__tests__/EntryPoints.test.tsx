import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { EntryPoints } from "@/components/home/EntryPoints";
import { getLocalizedRoute } from "@/lib/routing";

const counts = { peoples: 803, countries: 54, families: 24 };

function setMatchMediaMatches(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe("EntryPoints — three access-mode entry points (ETNI-1328, REQ-113)", () => {
  let matchMediaDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    matchMediaDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "matchMedia"
    );
    setMatchMediaMatches(false);
  });

  afterEach(() => {
    if (matchMediaDescriptor) {
      Object.defineProperty(window, "matchMedia", matchMediaDescriptor);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
  });

  // @req REQ-113
  it("renders exactly three entry points, one per access mode", () => {
    render(<EntryPoints language="fr" counts={counts} />);

    expect(screen.getByTestId("entry-point-peuples")).toBeInTheDocument();
    expect(screen.getByTestId("entry-point-pays")).toBeInTheDocument();
    expect(screen.getByTestId("entry-point-familles")).toBeInTheDocument();
    expect(
      screen.getAllByTestId(/^entry-point-(peuples|pays|familles)$/)
    ).toHaveLength(3);
  });

  // @req REQ-113
  it("links each entry point to its localized route", () => {
    render(<EntryPoints language="fr" counts={counts} />);

    expect(screen.getByTestId("entry-point-peuples")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "peoples")
    );
    expect(screen.getByTestId("entry-point-pays")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "countries")
    );
    expect(screen.getByTestId("entry-point-familles")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "families")
    );
  });

  // @req REQ-113
  it("renders a count that tracks the injected counts, not a literal", () => {
    const { rerender } = render(
      <EntryPoints
        language="fr"
        counts={{ peoples: 803, countries: 54, families: 24 }}
      />
    );
    expect(screen.getByTestId("entry-point-count-peuples")).toHaveTextContent(
      "803"
    );

    rerender(
      <EntryPoints
        language="fr"
        counts={{ peoples: 4213, countries: 91, families: 37 }}
      />
    );

    expect(screen.getByTestId("entry-point-count-peuples")).toHaveTextContent(
      "4213"
    );
    expect(screen.getByTestId("entry-point-count-pays")).toHaveTextContent(
      "91"
    );
    expect(screen.getByTestId("entry-point-count-familles")).toHaveTextContent(
      "37"
    );
  });

  // @req REQ-113
  it("gives each entry point a name, a count and one action verb, and no sentence", () => {
    render(<EntryPoints language="fr" counts={counts} />);

    const expectations: Array<[string, string, string]> = [
      ["peuples", "Peuples", "803"],
      ["pays", "Pays", "54"],
      ["familles", "Familles", "24"],
    ];

    for (const [id, name, count] of expectations) {
      expect(screen.getByTestId(`entry-point-name-${id}`)).toHaveTextContent(
        name
      );
      expect(screen.getByTestId(`entry-point-count-${id}`)).toHaveTextContent(
        count
      );
      const verb = screen.getByTestId(`entry-point-verb-${id}`);
      expect(verb).toHaveTextContent(/^\S+$/);

      const link = screen.getByTestId(`entry-point-${id}`);
      expect(link.textContent).not.toMatch(/[.!?]/);
    }
  });

  // @req REQ-113
  it("exposes a target of at least 44 by 44 px for every entry point", () => {
    render(<EntryPoints language="fr" counts={counts} />);

    for (const id of ["peuples", "pays", "familles"]) {
      const link = screen.getByTestId(`entry-point-${id}`);
      expect(link.className).toMatch(/min-h-\[44px\]/);
      expect(link.className).toMatch(/w-full/);
    }
  });

  // @req REQ-113
  it("lays the three entry points out as stacked rows", () => {
    render(<EntryPoints language="fr" counts={counts} />);

    expect(screen.getByTestId("entry-points").className).toMatch(/flex-col/);
  });

  // @req REQ-113
  it("runs the reveal/glyph animation when the reader has no reduced-motion preference", () => {
    setMatchMediaMatches(false);
    render(<EntryPoints language="fr" counts={counts} />);

    const link = screen.getByTestId("entry-point-peuples");
    expect(link.className).toMatch(/entry-point-reveal/);
    const icon = screen.getAllByTestId("entry-point-icon")[0];
    expect(icon.className).toMatch(/entry-point-glyph/);
  });

  // @req REQ-113
  it("runs no reveal or glyph animation under prefers-reduced-motion: reduce, and glyphs stay legible", () => {
    setMatchMediaMatches(true);
    render(<EntryPoints language="fr" counts={counts} />);

    const link = screen.getByTestId("entry-point-peuples");
    expect(link.className).not.toMatch(/entry-point-reveal/);
    const icon = screen.getAllByTestId("entry-point-icon")[0];
    expect(icon.className).not.toMatch(/entry-point-glyph/);
    expect(icon).toBeVisible();
  });
});
