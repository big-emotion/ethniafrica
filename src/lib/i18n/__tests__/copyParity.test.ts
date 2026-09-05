import { describe, expect, it } from "vitest";

import { COPY_MODULES } from "@/lib/i18n/copy";
import { LOCALES } from "@/lib/locale";
import { translations } from "@/lib/translations";

/**
 * `trail.segments` is keyed by URL segment, and the URL segments differ by
 * locale on purpose (DEC-049) — so it is the one branch where the two
 * dictionaries are not expected to share keys. `translations.test.ts` holds
 * it to the routing tables instead.
 */
const URL_KEYED_BRANCHES = new Set(["trail.segments"]);

/**
 * A French value that repeats the English one word for word is, above a few
 * words, a placeholder that was copied over and never translated. Below that
 * length the repeat is usually the same word in both languages — « Contact »,
 * « Quiz », « Sources » — and a brand string is the same by design.
 */
const IDENTICAL_VALUE_WORD_LIMIT = 3;
const IDENTICAL_VALUE_ALLOW_LIST = new Set([
  "common.madeWithEmotion",
  "footer.attribution",
]);

type Leaf = [path: string, value: unknown];

function leaves(value: unknown, prefix: string): Leaf[] {
  if (typeof value !== "object" || value === null) return [[prefix, value]];
  if (URL_KEYED_BRANCHES.has(prefix)) return [[prefix, "<url-keyed>"]];
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, `${prefix}.${key}`)
  );
}

const wordCount = (value: string): number =>
  value.trim().split(/\s+/).filter(Boolean).length;

const modules = Object.entries(COPY_MODULES);

describe("the per-surface copy dictionaries (REQ-145)", () => {
  // A key present in one locale and absent in the other is a label that
  // renders as `undefined` on one side of the site with a green build.
  // @req REQ-145
  it("gives every module the same nested keys in both locales", () => {
    for (const [name, dictionary] of modules) {
      const [reference, ...others] = LOCALES.map((locale) =>
        leaves(dictionary[locale], name)
          .map(([path]) => path)
          .sort()
      );
      for (const paths of others) {
        expect(paths, name).toEqual(reference);
      }
    }
  });

  // @req REQ-145
  it("leaves no empty string in any module or locale", () => {
    for (const [name, dictionary] of modules) {
      for (const locale of LOCALES) {
        for (const [path, value] of leaves(dictionary[locale], name)) {
          expect(typeof value, path).toBe("string");
          expect((value as string).trim().length, path).toBeGreaterThan(0);
        }
      }
    }
  });

  // @req REQ-145
  it("does not let a French value above three words repeat the English one", () => {
    for (const [name, dictionary] of modules) {
      const english = new Map(leaves(dictionary.en, name));
      for (const [path, french] of leaves(dictionary.fr, name)) {
        if (IDENTICAL_VALUE_ALLOW_LIST.has(path)) continue;
        if (typeof french !== "string") continue;
        if (wordCount(french) <= IDENTICAL_VALUE_WORD_LIMIT) continue;
        expect(french, path).not.toBe(english.get(path));
      }
    }
  });

  // An allow-list entry that no longer names an identical pair is a hole the
  // rule above would silently stop covering.
  // @req REQ-145
  it("keeps every allow-listed path pointing at a value that is identical", () => {
    for (const path of IDENTICAL_VALUE_ALLOW_LIST) {
      const [name] = path.split(".");
      const dictionary = COPY_MODULES[name as keyof typeof COPY_MODULES];
      const english = new Map(leaves(dictionary.en, name)).get(path);
      const french = new Map(leaves(dictionary.fr, name)).get(path);
      expect(french, path).toBe(english);
    }
  });
});

describe("the translations façade composes the modules (REQ-145)", () => {
  // The façade is what the forty-odd importers read, so a module the façade
  // forgot — or wired to the wrong locale — would pass the parity above and
  // still publish one language on both sides of the site.
  // @req REQ-145
  it("hands each surface group to the façade unchanged, locale by locale", () => {
    for (const locale of LOCALES) {
      const dictionary = translations[locale] as Record<string, unknown>;
      for (const [name, module] of modules) {
        if (name === "common") {
          for (const [key, value] of Object.entries(module[locale])) {
            expect(dictionary[key], `${locale}.${key}`).toBe(value);
          }
          continue;
        }
        expect(dictionary[name], `${locale}.${name}`).toBe(module[locale]);
      }
    }
  });
});
