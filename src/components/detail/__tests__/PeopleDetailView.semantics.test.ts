import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PeopleDetailView heading hierarchy", () => {
  // @req REQ-019
  it("uses h2 headings for the cards directly below the page h1", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/detail/PeopleDetailView.tsx"),
      "utf8"
    );

    expect(source).not.toContain("<CardTitle");
    expect(source.match(/<h2 /g)?.length).toBe(9);
    expect(source).not.toContain("<h4");
  });
});
