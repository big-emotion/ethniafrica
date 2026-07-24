import { describe, expect, it } from "vitest";

import { validateActionPins } from "../checkGithubActionPins";

describe("validateActionPins", () => {
  // @req REQ-085
  it("accepts full commit SHAs and local actions", () => {
    const workflow = `
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
- uses: ./.github/actions/local
`;

    expect(validateActionPins(workflow, "ci.yml")).toEqual([]);
  });

  // @req REQ-085
  it("rejects mutable tags and branches", () => {
    const workflow = `
- uses: actions/checkout@v7
- uses: owner/action@main
`;

    expect(validateActionPins(workflow, "ci.yml")).toEqual([
      "ci.yml:2: action actions/checkout@v7 is not pinned to a 40-character commit SHA",
      "ci.yml:3: action owner/action@main is not pinned to a 40-character commit SHA",
    ]);
  });
});
