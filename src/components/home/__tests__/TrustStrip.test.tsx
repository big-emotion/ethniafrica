import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrustStrip } from "@/components/home/TrustStrip";

describe("TrustStrip — the home's one claim about itself (REQ-113)", () => {
  // @req REQ-113
  it("links the sourcing claim to the page that backs it", () => {
    render(<TrustStrip language="fr" />);

    expect(screen.getByRole("link", { name: /doctrine/i })).toHaveAttribute(
      "href",
      "/fr/doctrine"
    );
  });

  // axe flagged this on the live /fr route as link-in-text-block. Inside a
  // paragraph a link set apart by colour alone is invisible to a reader who
  // cannot see the colour difference, and Tailwind's preflight has already
  // dropped the browser's default underline — the rule set an underline
  // offset without ever asking for the underline it offsets.
  // @req REQ-113
  it("distinguishes the inline link by more than its colour", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/home/TrustStrip.tsx"),
      "utf8"
    );
    const linkRule = source.match(/\.home-trust a\s*\{([^}]*)\}/);

    expect(linkRule).not.toBeNull();
    expect(linkRule![1]).toMatch(/text-decoration:\s*underline/);
  });
});
