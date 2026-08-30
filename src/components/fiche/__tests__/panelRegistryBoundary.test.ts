/**
 * The panel registry resolves chapters during the server render, so anything
 * it *calls* has to be server-safe. Importing a client module is fine when the
 * import is a component — React renders those across the boundary — but calling
 * a plain function exported from a `"use client"` module throws at request time:
 *
 *   Attempted to call hasScaleContent() from the server but hasScaleContent is
 *   on the client.
 *
 * That is what took every fiche route to a 500 between ETNI-812 and this story,
 * and no happy-dom suite can see it: the boundary only exists in the RSC
 * runtime. This suite encodes the rule statically instead, using React's own
 * naming convention — PascalCase imports are components and may cross, anything
 * camelCase may not.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const FICHE_DIR = resolve(process.cwd(), "src/components/fiche");

function readFicheModule(fileName: string): string {
  return readFileSync(resolve(FICHE_DIR, fileName), "utf8");
}

function isClientModule(fileName: string): boolean {
  return /^\s*["']use client["']/.test(readFicheModule(fileName));
}

interface NamedImport {
  binding: string;
  fromFile: string;
}

/** Value imports only — `import type` erases before it can reach the runtime. */
function parseFicheImports(source: string): NamedImport[] {
  const importPattern =
    /import\s+(?!type\s)\{([^}]+)\}\s+from\s+["']@\/components\/fiche\/([\w.]+)["']/g;
  const imports: NamedImport[] = [];

  for (const match of source.matchAll(importPattern)) {
    const [, bindings, moduleName] = match;
    for (const binding of bindings.split(",")) {
      const name = binding.trim().replace(/^type\s+/, "");
      if (!name || binding.trim().startsWith("type ")) continue;
      imports.push({ binding: name, fromFile: `${moduleName}.tsx` });
    }
  }

  return imports;
}

const isComponentName = (binding: string) => /^[A-Z]/.test(binding);

describe("panel registry server/client boundary", () => {
  // @req REQ-091
  it("never calls a function exported from a client module", () => {
    const registrySource = readFicheModule("panelRegistry.tsx");

    const crossings = parseFicheImports(registrySource)
      .filter(({ fromFile }) => isClientModule(fromFile))
      .filter(({ binding }) => !isComponentName(binding));

    expect(
      crossings,
      crossings
        .map(
          ({ binding, fromFile }) =>
            `panelRegistry imports ${binding}() from ${fromFile}, which is a "use client" module. ` +
            `Move ${binding} into a server-safe module (e.g. src/lib/) and import it from there.`
        )
        .join("\n")
    ).toEqual([]);
  });

  // Guards the guard: if the import parser silently stopped matching, the rule
  // above would pass vacuously on an empty crossing list.
  // @req REQ-091
  it("resolves the client panels the registry is known to import", () => {
    const clientImports = parseFicheImports(
      readFicheModule("panelRegistry.tsx")
    ).filter(({ fromFile }) => isClientModule(fromFile));

    expect(clientImports.map(({ binding }) => binding)).toEqual(
      expect.arrayContaining(["ScalePanel", "VoicesPanel", "RecordPanel"])
    );
  });
});
