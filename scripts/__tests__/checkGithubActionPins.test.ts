import { describe, expect, it } from "vitest";

import {
  extractActionPins,
  findUnresolvablePins,
  validateActionPins,
} from "../checkGithubActionPins";

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

describe("findUnresolvablePins", () => {
  // The storybook deploy failed fifteen runs in a row on a pin whose shape was
  // perfect and whose commit never existed: the last eleven characters were
  // wrong. Only asking the host whether the commit exists catches that.
  const workflow = `
- uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4.0.5
- uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac1b2b5c113 # v4.0.5
- uses: big-emotion/ferry/.github/actions/ferry-route@39a42f9f5607d22c38f453bb33212c0c94750486 # v1.2.0
- uses: big-emotion/ferry/.github/actions/ferry-emit-audit@39a42f9f5607d22c38f453bb33212c0c94750486 # v1.2.0
`;
  const publishedCommits = new Set([
    "actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e",
    "big-emotion/ferry@39a42f9f5607d22c38f453bb33212c0c94750486",
  ]);

  // @req REQ-085
  it("fails a well-formed pin whose commit does not exist upstream", async () => {
    const errors = await findUnresolvablePins(
      extractActionPins(workflow, "storybook-deploy.yml"),
      async (repository, sha) => publishedCommits.has(`${repository}@${sha}`)
    );

    expect(errors).toEqual([
      "storybook-deploy.yml:3: action actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac1b2b5c113 points at a commit that does not exist in actions/deploy-pages",
    ]);
  });

  // @req REQ-085
  it("asks once per repository commit, resolving sub-path actions against their repository", async () => {
    const asked: string[] = [];

    await findUnresolvablePins(
      extractActionPins(workflow, "ferry.yml"),
      async (repository, sha) => {
        asked.push(`${repository}@${sha}`);
        return true;
      }
    );

    expect(asked.sort()).toEqual([
      "actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac1b2b5c113",
      "actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e",
      "big-emotion/ferry@39a42f9f5607d22c38f453bb33212c0c94750486",
    ]);
  });
});
