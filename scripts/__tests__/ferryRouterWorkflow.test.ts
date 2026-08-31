import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/ferry-router.yml"),
  "utf8"
);

describe("Ferry router workflow", () => {
  // @req REQ-085
  it("pushes agent changes with a GitHub App token", () => {
    expect(workflow).toContain("id: ferry-token");
    expect(workflow).toContain(
      "uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0"
    );
    expect(workflow).toContain("app-id: ${{ secrets.FERRY_APP_ID }}");
    expect(workflow).toContain("private-key: ${{ secrets.FERRY_PRIVATE_KEY }}");
    expect(workflow).toContain(
      "checkout_token: ${{ steps.ferry-token.outputs.token }}"
    );
    expect(workflow).not.toContain(
      "checkout_token: ${{ secrets.FERRY_CHECKOUT_TOKEN }}"
    );
  });
});
