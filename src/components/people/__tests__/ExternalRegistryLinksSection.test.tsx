import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { ExternalRegistryLinksSection } from "../ExternalRegistryLinksSection";

describe("ExternalRegistryLinksSection", () => {
  afterEach(cleanup);

  // @req REQ-128
  it("renders a link with the correct href for each present identifier", () => {
    render(
      <ExternalRegistryLinksSection
        identifiers={{
          wikidataId: "Q34266",
          glottocode: "ewee1241",
          iso639_3: "ewe",
        }}
      />
    );

    expect(screen.getByRole("link", { name: "Wikidata" })).toHaveAttribute(
      "href",
      "https://www.wikidata.org/wiki/Q34266"
    );
    expect(screen.getByRole("link", { name: "Glottolog" })).toHaveAttribute(
      "href",
      "https://glottolog.org/resource/languoid/id/ewee1241"
    );
    expect(screen.getByRole("link", { name: "ISO 639-3" })).toHaveAttribute(
      "href",
      "https://iso639-3.sil.org/code/ewe"
    );
  });

  // @req REQ-128
  it("renders nothing when identifiers is undefined", () => {
    const { container } = render(
      <ExternalRegistryLinksSection identifiers={undefined} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  // @req REQ-128
  it("renders nothing when identifiers is present but empty", () => {
    const { container } = render(
      <ExternalRegistryLinksSection identifiers={{}} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
