import { describe, expect, it } from "vitest";

import { NOMMER_CHAPTERS } from "@/lib/dossiers/nommer/chapters";

/**
 * A prose block's `id` is what an English sidecar keys on. Positional keying
 * would have been cheaper, and it is exactly how a translation silently
 * attaches itself to the wrong paragraph the day someone inserts one — so
 * the id is required, and required to be unique inside its chapter.
 */
describe.each(NOMMER_CHAPTERS)("the Nommer chapter $key", (chapter) => {
  // @req REQ-145
  it("gives every prose block a kebab-case id, unique within the chapter", () => {
    const ids = [
      chapter.standfirst.id,
      ...chapter.sections.flatMap((section) =>
        section.blocks.map((block) => block.id)
      ),
    ];

    for (const id of ids) {
      expect(id, `${chapter.key}: a block without an id`).toMatch(
        /^[a-z0-9]+(-[a-z0-9]+)*$/
      );
    }
    expect(new Set(ids).size, `${chapter.key}: duplicate block ids`).toBe(
      ids.length
    );
  });
});
