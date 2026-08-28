import { describe, expect, it } from "vitest";

import { cn } from "../utils";

/**
 * `cn()` is `twMerge(clsx(...))`, and tailwind-merge decides what a `text-*`
 * utility means from a closed list of scale keys. `afh-small` is not on that
 * list, so out of the box it is classified as a **text colour** — which makes
 * `cn("text-afh-small", "text-white")` drop the size entirely and keep only
 * the colour, silently.
 *
 * That is not hypothetical: it is exactly what happened to `<Button>`, whose
 * default variant is `text-white`. Every button in the product lost its size
 * and fell back to the inherited one, with no error and no visual clue beyond
 * the size itself.
 */
describe("cn() tells the type scale apart from text colours", () => {
  // @req REQ-091
  it("keeps a size and a colour that are not in conflict", () => {
    const merged = cn("text-afh-small", "text-white").split(" ");
    expect(merged).toContain("text-afh-small");
    expect(merged).toContain("text-white");
  });

  // @req REQ-091
  it("keeps a size beside every afh colour token", () => {
    for (const colour of [
      "text-afh-text",
      "text-afh-text-soft",
      "text-afh-text-muted",
      "text-afh-terracotta",
    ]) {
      const merged = cn("text-afh-body", colour).split(" ");
      expect(merged, colour).toContain("text-afh-body");
      expect(merged, colour).toContain(colour);
    }
  });

  // @req REQ-091
  it("still lets one scale role override another", () => {
    expect(cn("text-afh-body", "text-afh-h2")).toBe("text-afh-h2");
    expect(cn("text-afh-caption", "text-afh-eyebrow")).toBe("text-afh-eyebrow");
  });

  // @req REQ-091
  it("still lets a scale role override a stock Tailwind size", () => {
    expect(cn("text-sm", "text-afh-small")).toBe("text-afh-small");
    expect(cn("text-afh-small", "text-2xl")).toBe("text-2xl");
  });

  // @req REQ-091
  it("still collapses two colours down to the last one", () => {
    expect(cn("text-afh-text", "text-afh-terracotta")).toBe(
      "text-afh-terracotta"
    );
  });

  // @req REQ-091
  it("keeps a responsive override on its own breakpoint", () => {
    const merged = cn("text-afh-body", "md:text-afh-h3").split(" ");
    expect(merged).toContain("text-afh-body");
    expect(merged).toContain("md:text-afh-h3");
  });
});
