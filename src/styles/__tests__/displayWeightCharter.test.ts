import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Brand charter §6 — two display weights, and both of them loaded.
 *
 * `app/layout.tsx` loads Fraunces at 300/500/700/900. A CSS rule asking for
 * 600 therefore resolves to 700, silently: the charter's own canonical
 * "display 600" was a weight the product could not render, and two files
 * asked for it.
 *
 * Fixing that moved no pixels — 600 already rendered as 700. What changed is
 * that the stylesheet now says what happens, which is the only way the next
 * reader of it learns the same thing without measuring.
 */
const SRC = join(__dirname, "..", "..");

function loadedFraunces(): number[] {
  const layout = readFileSync(join(SRC, "app", "layout.tsx"), "utf8");
  const block = layout.slice(layout.indexOf("const fraunces"));
  const weights = block.slice(0, 200).match(/weight:\s*\[([^\]]*)\]/);
  expect(weights).not.toBeNull();
  return weights![1].split(",").map((w) => Number(w.replace(/["'\s]/g, "")));
}

/** Every file that both names the display family and sets a weight near it. */
function displayWeightDeclarations(): { file: string; weight: number }[] {
  const found: { file: string; weight: number }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(css|tsx)$/.test(entry)) continue;
      const text = readFileSync(full, "utf8");
      const rx =
        /font-family:\s*var\(--afh-font-display\)[^}]{0,200}?font-weight:\s*(\d{3})/g;
      let m: RegExpExecArray | null;
      while ((m = rx.exec(text))) {
        found.push({ file: full.slice(SRC.length + 1), weight: Number(m[1]) });
      }
    }
  };
  walk(join(SRC, "styles"));
  walk(join(SRC, "components"));
  return found;
}

describe("display weight charter (§6)", () => {
  // @req REQ-115
  it("asks only for weights the font actually loads", () => {
    const loaded = loadedFraunces();
    const asked = displayWeightDeclarations();

    expect(asked.length).toBeGreaterThan(0);

    const unloadable = asked.filter((d) => !loaded.includes(d.weight));
    expect(unloadable).toEqual([]);
  });

  // @req REQ-115
  it("uses two of them, not four", () => {
    const distinct = [
      ...new Set(displayWeightDeclarations().map((d) => d.weight)),
    ].sort();

    expect(distinct).toEqual([700, 900]);
  });
});
