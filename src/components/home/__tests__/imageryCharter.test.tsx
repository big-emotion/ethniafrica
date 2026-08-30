import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PurposeBlocks } from "@/components/home/PurposeBlocks";

/**
 * Brand charter §9 — imagery, and the provenance it owes.
 *
 * The home's four pictures are documents the blocks they sit in are about, and
 * they span more than one register: al-Idrisi drawing the world from Ceuta in
 * 1154, Ogilby's 1670 coast labelled by merchandise, a 2006 photograph of
 * tifinagh carved in rock, and the portrait of the man who coined "Bantou".
 *
 * One of them is CC BY-SA 2.0, and that licence asks for more than a name.
 * §4(a): include "a copy of, or the Uniform Resource Identifier for, this
 * License with every copy of the Work you distribute". The caption used to
 * read "Patrick Gruban, CC BY-SA 2.0" and stop, which credits the author and
 * leaves the licence unreachable — on the surface whose whole argument is that
 * a claim travels with its provenance.
 */
const CREDITS = readFileSync(
  join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "public",
    "images",
    "home",
    "CREDITS.md"
  ),
  "utf8"
);

describe("home imagery charter (§9)", () => {
  // @req REQ-113
  it("publishes the licence URI of a picture whose licence requires attribution", () => {
    render(<PurposeBlocks language="fr" />);

    const licence = screen.getByRole("link", { name: "CC BY-SA 2.0" });

    expect(licence).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by-sa/2.0/"
    );
    // rel="license" is what tells a machine which link is the licence.
    expect(licence.getAttribute("rel")).toContain("license");
  });

  // @req REQ-113
  it("names the author beside it, in the same caption", () => {
    render(<PurposeBlocks language="fr" />);

    const caption = screen
      .getByRole("link", { name: "CC BY-SA 2.0" })
      .closest("figcaption");

    expect(caption).not.toBeNull();
    expect(caption).toHaveTextContent("Patrick Gruban");
    // And the file itself, so a reader can check the claim rather than take it.
    expect(
      within(caption!).getByRole("link", { name: "source" })
    ).toHaveAttribute(
      "href",
      "https://commons.wikimedia.org/wiki/File:Tifinagh_Algeria.jpg"
    );
  });

  // @req REQ-113
  it("keeps a written provenance record beside the files", () => {
    // The rendered caption is what the licence requires; this file is what a
    // maintainer needs. Losing it would leave four pictures whose terms are
    // only recoverable by asking Commons again.
    expect(CREDITS).toContain("al-idrisi-1154.jpg");
    expect(CREDITS).toContain("guinea-ogilby-1670.jpg");
    expect(CREDITS).toContain("tifinagh-algeria.jpg");
    expect(CREDITS).toContain("wilhelm-bleek.jpg");
  });
});
