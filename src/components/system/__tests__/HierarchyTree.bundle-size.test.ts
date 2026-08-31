import { readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

import ts from "typescript";
import { describe, expect, it } from "vitest";

// Budget: HierarchyTree + wrapper JS <= 8 KB gzipped (spec Performance section,
// same class as SourceChainSheet, UX-DR46). The repo has zero new npm
// dependencies for this component and no bundle-analysis tooling (size-limit,
// bundlesize) is installed — adding one would violate the "zero new
// dependencies" constraint. As a proxy, we transpile the component's own
// source with the `typescript` compiler (already a devDependency) to strip
// types/JSX down to plain JS, then gzip that with Node's built-in `zlib`.
// This measures the component's own code, not its shared runtime deps
// (React, lucide-react, Next `Link`) which are already loaded elsewhere in
// the app shell and are not part of this budget.
const GZIP_BUDGET_BYTES = 8 * 1024;

describe("HierarchyTree — bundle size budget", () => {
  // @req REQ-047
  it("stays under the 8 KB gzipped budget for the component's own code", () => {
    const sourcePath = path.resolve(__dirname, "../HierarchyTree.tsx");
    const source = readFileSync(sourcePath, "utf-8");

    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        removeComments: true,
      },
      fileName: "HierarchyTree.tsx",
    });

    const gzipped = gzipSync(Buffer.from(outputText, "utf-8"));

    expect(gzipped.byteLength).toBeLessThanOrEqual(GZIP_BUDGET_BYTES);
  });
});
