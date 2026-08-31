import { describe, expect, it } from "vitest";

import {
  checkCatalog,
  checkExportTraceability,
  checkNewExports,
  checkTestAnnotations,
  resolveLintMode,
} from "../lintReqAnnotations";
import requirementCatalog from "../../docs/confluence-spec/req-catalog.json";

describe("resolveLintMode", () => {
  // The 1245 unannotated tests already in the tree mean a repo-wide strict run
  // can never gate. Both enforcing modes are therefore diff-scoped: pre-commit
  // against HEAD, CI against the PR base, so only what a change introduces has
  // to comply.
  // @req REQ-085
  it("leaves a bare run lenient so it stays usable as a local survey", () => {
    expect(resolveLintMode([])).toEqual({
      strictTests: false,
      diffBase: undefined,
    });
  });

  // @req REQ-085
  it("enforces against HEAD when run from the pre-commit hook", () => {
    expect(resolveLintMode(["--staged"])).toEqual({
      strictTests: true,
      diffBase: "HEAD",
    });
  });

  // @req REQ-085
  it("enforces against the pull request base when CI supplies one", () => {
    expect(resolveLintMode(["--base", "origin/recette"])).toEqual({
      strictTests: true,
      diffBase: "origin/recette",
    });
  });

  // Without this the flag reads as `--base undefined` and the git diff resolves
  // to the whole tree, silently re-running the repo-wide mode that cannot pass.
  // @req REQ-085
  it("rejects --base with no ref rather than falling back to the whole tree", () => {
    expect(() => resolveLintMode(["--base"])).toThrow(/--base/);
  });
});

describe("checkTestAnnotations", () => {
  // @req REQ-085
  it("reports a test without a nearby requirement annotation", () => {
    const result = checkTestAnnotations(
      [
        "import { test } from 'vitest';",
        "",
        "test('does something', () => {});",
      ].join("\n"),
      "src/example.test.ts"
    );

    expect(result.errors).toEqual([
      "src/example.test.ts:3:1: missing @req annotation — add // @req REQ-NNN within 3 lines above this test/it call",
    ]);
  });

  // @req REQ-085
  it("accepts annotations on the same line or within the three preceding lines", () => {
    const content = [
      "// @req REQ-042",
      "",
      "test('first behavior', () => {});",
      "",
      "it('second behavior', () => {}); // @req REQ-043",
    ].join("\n");

    expect(checkTestAnnotations(content, "src/example.test.ts").errors).toEqual(
      []
    );
  });

  // @req REQ-085
  it("recognizes multiline and modifier-based Vitest definitions", () => {
    const content = [
      "// @req REQ-001",
      "test.skip(",
      "  'multiline behavior',",
      "  () => {},",
      ");",
      "// @req REQ-002",
      "it.concurrent('concurrent behavior', async () => {});",
    ].join("\n");

    expect(checkTestAnnotations(content, "src/example.test.ts").errors).toEqual(
      []
    );
  });

  // @req REQ-085
  it("ignores imperative runtime skips whose first argument is not a test name", () => {
    const content = [
      "// @req REQ-001",
      "test('guarded behavior', () => {",
      "  test.skip(true, 'runtime guard');",
      "});",
    ].join("\n");

    expect(checkTestAnnotations(content, "src/example.test.ts").errors).toEqual(
      []
    );
  });

  // @req REQ-085
  it("grandfathers existing test names when previous content is provided", () => {
    const previousContent = "test('existing behavior', () => {});\n";
    const content = [
      "test('existing behavior', () => {});",
      "test('new behavior', () => {});",
    ].join("\n");

    expect(
      checkTestAnnotations(content, "src/example.test.ts", previousContent)
        .errors
    ).toEqual([
      "src/example.test.ts:2:1: missing @req annotation — add // @req REQ-NNN within 3 lines above this test/it call",
    ]);
  });
});

describe("checkExportTraceability", () => {
  // @req REQ-085
  it("reports an annotated export when no test references its requirement", () => {
    const files = [
      {
        path: "src/example.ts",
        content: "/** @req REQ-099 */\nexport function example() {}\n",
      },
      {
        path: "src/example.test.ts",
        content: "// @req REQ-001\ntest('example', () => {});\n",
      },
    ];

    expect(checkExportTraceability(files).errors).toEqual([
      "src/example.ts:1:1: exported symbol annotated @req REQ-099 has no corresponding test annotation",
    ]);
  });

  // @req REQ-085
  it("accepts an annotated export when a test references the same requirement", () => {
    const files = [
      {
        path: "src/example.ts",
        content: "/** @req REQ-099 */\nexport const example = () => true;\n",
      },
      {
        path: "src/example.test.ts",
        content: "// @req REQ-099\ntest('example', () => {});\n",
      },
    ];

    expect(checkExportTraceability(files).errors).toEqual([]);
  });

  // @req REQ-085
  it("ignores annotation-like text inside test fixture strings", () => {
    const files = [
      {
        path: "src/example.ts",
        content: "/** @req REQ-043 */\nexport function example() {}\n",
      },
      {
        path: "src/example.test.ts",
        content: `"test('fixture', () => {}); // @req REQ-043";\n`,
      },
    ];

    expect(checkExportTraceability(files).errors).toEqual([
      "src/example.ts:1:1: exported symbol annotated @req REQ-043 has no corresponding test annotation",
    ]);
  });
});

describe("checkNewExports", () => {
  // @req REQ-085
  it("warns about an exported function without a requirement annotation", () => {
    expect(
      checkNewExports("export function example() {}", "src/example.ts").warnings
    ).toEqual([
      'src/example.ts:1:1: new export "example" lacks @req annotation',
    ]);
  });

  // @req REQ-085
  it("accepts an export with a nearby requirement annotation", () => {
    const content = [
      "/**",
      " * @req REQ-042",
      " */",
      "export const example = () => true;",
    ].join("\n");

    expect(checkNewExports(content, "src/example.ts").warnings).toEqual([]);
  });
});

describe("checkCatalog", () => {
  // @req REQ-132
  it("accepts REQ-132 from the repository requirement catalog", () => {
    const result = checkCatalog(
      "// @req REQ-132\ntest('about page', () => {});",
      "src/app/a-propos/page.test.tsx",
      requirementCatalog
    );

    expect(result.errors).toEqual([]);
  });

  // @req REQ-085
  it("reports requirement references absent from the catalog", () => {
    const result = checkCatalog(
      "// @req REQ-999\ntest('example', () => {});",
      "src/example.test.ts",
      { requirements: ["REQ-001"] }
    );

    expect(result.errors).toEqual([
      'src/example.test.ts:1:9: REQ-NNN "REQ-999" is not registered in docs/confluence-spec/req-catalog.json',
    ]);
  });

  // @req REQ-085
  it("accepts registered requirement references", () => {
    const result = checkCatalog(
      "// @req REQ-001\ntest('example', () => {});",
      "src/example.test.ts",
      { requirements: ["REQ-001"] }
    );

    expect(result.errors).toEqual([]);
  });
});
