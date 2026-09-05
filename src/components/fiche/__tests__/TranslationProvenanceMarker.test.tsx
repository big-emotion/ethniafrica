import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { TranslationProvenanceMarker } from "@/components/fiche/TranslationProvenanceMarker";

describe("TranslationProvenanceMarker (REQ-142)", () => {
  // @req REQ-142
  it("states that a machine translation has not been reviewed (AC1)", () => {
    render(
      <TranslationProvenanceMarker
        translation={{ kind: "machine", stale: false }}
      />
    );

    const marker = screen.getByRole("status");
    expect(marker).toHaveTextContent("Machine translation, not yet reviewed");
    expect(marker).toHaveAttribute(
      "aria-label",
      "Machine translation, not yet reviewed"
    );
  });

  // @req REQ-142
  it("reflects the reviewed standing (AC2)", () => {
    render(
      <TranslationProvenanceMarker
        translation={{ kind: "machine_reviewed", stale: false }}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Machine translation, reviewed"
    );
  });

  // @req REQ-142
  it("names a human translation", () => {
    render(
      <TranslationProvenanceMarker
        translation={{ kind: "human", stale: false }}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("Human translation");
  });

  // @req REQ-142
  it("appends the stale suffix when the source moved since", () => {
    render(
      <TranslationProvenanceMarker
        translation={{ kind: "machine_reviewed", stale: true }}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Machine translation, reviewed — source updated since"
    );
  });

  // @req REQ-142
  it("renders nothing when the record is not translated", () => {
    const { container } = render(
      <TranslationProvenanceMarker translation={null} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  // @req REQ-142
  it("takes the dictionary the caller passes, so the foundation can localise it", () => {
    render(
      <TranslationProvenanceMarker
        translation={{ kind: "machine", stale: true }}
        labels={{
          machine: "Traduction automatique, non relue",
          staleSuffix: "— source modifiée depuis",
        }}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Traduction automatique, non relue — source modifiée depuis"
    );
  });

  // Provenance is apparatus, not alarm: no icon carries the meaning and no
  // colour is named in the component — the Badge variants carry the tokens.
  // @req REQ-142
  it("uses no icon and no colour literal", () => {
    const { container } = render(
      <TranslationProvenanceMarker
        translation={{ kind: "machine", stale: false }}
      />
    );
    expect(container.querySelector("svg, img")).toBeNull();

    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/components/fiche/TranslationProvenanceMarker.tsx"
      ),
      "utf8"
    );
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
    expect(source).not.toMatch(/variant="destructive"/);
  });
});
