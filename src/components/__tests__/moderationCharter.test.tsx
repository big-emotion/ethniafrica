import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { FlagPublicStatus } from "@/components/flags/FlagPublicStatus";

// Charter §3.2 — the transparency + moderation family (public reports queue
// /fr/signalements and the moderator's queue on /fr/admin) moves onto
// parchment (--afh-*) chrome tokens with density preserved. Status /
// classification / flag badges are the sanctioned semantic exception and
// must stay byte-identical — this file guards both halves of that contract.
//
// The workspace half used to be /admin/contributions, a second console with
// its own table and its own approve/reject buttons. It is gone: contributions
// are flags now, and there is one queue.

const SRC_DIR = join(process.cwd(), "src");

function readSource(relativePath: string): string {
  return readFileSync(join(SRC_DIR, relativePath), "utf8");
}

// Raw Tailwind palette classes that must not appear in restyled chrome —
// every chrome color must resolve through an --afh-* token instead.
const RAW_PALETTE_CLASS =
  /\b(?:bg|text|border)-(?:red|green|gray|blue|yellow|indigo|purple|pink)-[0-9]{2,3}\b/;

const CHROME_FILES = [
  "components/admin/ModerationQueue.tsx",
  "components/flags/PublicFlagsQueue.tsx",
];

describe("moderation + transparency chrome tokenization (ETNI-805 · FR109 §3.2)", () => {
  describe.each(CHROME_FILES)("%s", (file) => {
    // @req REQ-091
    it("uses no raw Tailwind palette color class", () => {
      const source = readSource(file);
      const offenders = source
        .split("\n")
        .filter((line) => RAW_PALETTE_CLASS.test(line));
      expect(offenders).toEqual([]);
    });

    // @req REQ-091
    it("consumes at least one --afh-* charter token", () => {
      const source = readSource(file);
      expect(source).toMatch(/afh-/);
    });
  });

  describe("semantic status badges stay byte-identical (charter §3.2 exclusion)", () => {
    const EXPECTED_COLORS: Record<
      string,
      { backgroundColor: string; color: string }
    > = {
      open: { backgroundColor: "#FEF3C7", color: "#92400E" },
      under_review: { backgroundColor: "#FEF3C7", color: "#92400E" },
      accepted: { backgroundColor: "#D1FAE5", color: "#065F46" },
      rejected: { backgroundColor: "#F3F4F6", color: "#374151" },
      duplicate: { backgroundColor: "#F3F4F6", color: "#374151" },
      withdrawn: { backgroundColor: "#F3F4F6", color: "#6B7280" },
    };

    it.each(
      Object.entries(EXPECTED_COLORS) as [
        keyof typeof EXPECTED_COLORS,
        { backgroundColor: string; color: string },
      ][]
    )(
      "status=%s keeps its exact computed color",
      // @req REQ-091
      (status, expected) => {
        const { unmount } = render(
          // @ts-expect-error — status union is narrowed by the six literal keys above
          <FlagPublicStatus status={status} />
        );
        const badge = screen.getByTestId("flag-status-badge");
        expect(badge.style.backgroundColor).toBe(expected.backgroundColor);
        expect(badge.style.color).toBe(expected.color);
        unmount();
      }
    );

    // @req REQ-091
    it("badge colors are not derived from any --afh-* chrome token", () => {
      const source = readSource("components/flags/FlagPublicStatus.tsx");
      const styleBlockMatch = source.match(/STATUS_CONFIG[\s\S]*?^};/m)?.[0];
      expect(styleBlockMatch).toBeDefined();
      expect(styleBlockMatch).not.toMatch(/var\(--afh-/);
    });
  });
});
