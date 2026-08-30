import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const colorCss = readFileSync(
  resolve(process.cwd(), "src/styles/tokens/color.css"),
  "utf8"
);

function tokenHex(name: string): string {
  const match = colorCss.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!match) throw new Error(`Missing hexadecimal token ${name}`);
  return match[1];
}

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4)
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

// The night block re-declares only the tokens it changes, so "is this token
// theme-aware?" is answered by whether it is rebound after `.dark,`.
function nightScopeOf(css: string): string {
  return css.slice(css.indexOf(".dark,"));
}

function resolvedHex(name: string): string {
  let current = name;
  for (let hop = 0; hop < 8; hop += 1) {
    const match = colorCss.match(
      new RegExp(`${current}:\\s*(#[0-9a-f]{6}|var\\(--[a-z0-9-]+\\))`, "i")
    );
    if (!match) throw new Error(`Missing token ${current}`);
    if (match[1].startsWith("#")) return match[1];
    current = match[1].slice(4, -1);
  }
  throw new Error(`Token ${name} never resolves to a hex`);
}

function contrastRatio(foreground: string, background: string): number {
  const values = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("AFH color tokens", () => {
  // @req REQ-090
  it("keeps small gold text AA-readable on its lightest surfaces", () => {
    const gold = tokenHex("--afh-color-gold");
    expect(
      contrastRatio(gold, tokenHex("--afh-color-gold-bg"))
    ).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(gold, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  // @req REQ-090
  it("keeps soft text AA-readable on the earth surface", () => {
    expect(
      contrastRatio(
        tokenHex("--afh-color-text-soft"),
        tokenHex("--afh-color-earth-bg")
      )
    ).toBeGreaterThanOrEqual(4.5);
  });

  // The full-strength accent is a fill colour, not an ink: every --afh-cat-*
  // base sits between 2.28:1 and 3.09:1 on its own tint, so text tinted with
  // it fails AA. --afh-cat-*-ink is the readable counterpart, and it only
  // earns its place if it clears the bar on every accent.
  // @req REQ-090
  it.each(["ocre", "teal", "terre", "perv"])(
    "keeps %s accent ink AA-readable on its own tint",
    (accent) => {
      expect(
        contrastRatio(
          tokenHex(`--afh-cat-${accent}-ink`),
          tokenHex(`--afh-cat-${accent}-tint`)
        )
      ).toBeGreaterThanOrEqual(4.5);
    }
  );
});

// The stake and the figure are the smallest type on the home — 11.5-13.5px —
// and they carry the corpus counts and what each axis gives back, so they are
// content, not decoration. The muted ink they were first given clears AA on
// neither card: 3.29:1 on parchment, 4.21:1 at night. These pin the pairing to
// a token that does, on whichever surface the reader is on.
describe("home axis card text (REQ-113)", () => {
  const accessAxes = readFileSync(
    resolve(process.cwd(), "src/components/home/AccessAxes.tsx"),
    "utf8"
  );

  // A token can be rebound per theme, so a binding has to be read inside the
  // block that applies. Everything before `.dark,` is the parchment default;
  // the night block re-declares only what it changes, so a night lookup falls
  // back to the default when the token is not rebound.
  const nightStart = colorCss.indexOf(".dark,");
  const dayScope = colorCss.slice(0, nightStart);
  const nightScope = colorCss.slice(nightStart);

  function bindingIn(scope: string, name: string): string | null {
    const match = scope.match(
      new RegExp(`${name}:\\s*(#[0-9a-f]{6}|var\\(--[a-z0-9-]+\\))`, "i")
    );
    return match ? match[1] : null;
  }

  function resolve_(name: string, night: boolean): string {
    let current = name;
    for (let hop = 0; hop < 8; hop += 1) {
      const value =
        (night ? bindingIn(nightScope, current) : null) ??
        bindingIn(dayScope, current);
      if (!value) throw new Error(`Unbound token ${current}`);
      if (value.startsWith("#")) return value;
      current = value.slice(4, -1);
    }
    throw new Error(`Token ${name} never resolves to a hex`);
  }

  function colorTokenOf(selector: string): string {
    const block = accessAxes.match(
      new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`)
    );
    if (!block) throw new Error(`Missing ${selector} rule`);
    const color = block[1].match(/color:\s*var\((--[a-z0-9-]+)\)/i);
    if (!color) throw new Error(`Missing colour on ${selector}`);
    return color[1];
  }

  // The stake line is the same class of type as the figure — small, content,
  // on the same two cards — so it is held to the same bar rather than to a
  // comment asking the next author to remember.
  const SMALL_CARD_TEXT = [".access-axis-figure", ".access-axis-stake"];

  // @req REQ-113
  it.each(SMALL_CARD_TEXT)(
    "keeps %s AA-readable on the parchment card",
    (selector) => {
      expect(
        contrastRatio(
          resolve_(colorTokenOf(selector), false),
          tokenHex("--afh-color-card")
        )
      ).toBeGreaterThanOrEqual(4.5);
    }
  );

  // @req REQ-115
  it.each(SMALL_CARD_TEXT)(
    "keeps %s AA-readable on the night card",
    (selector) => {
      expect(
        contrastRatio(
          resolve_(colorTokenOf(selector), true),
          tokenHex("--afh-night-surface-2")
        )
      ).toBeGreaterThanOrEqual(4.5);
    }
  );
});

// The fiche surfaces predate the --afh-* layer and still speak --country-*.
// people-tokens.css consumes the same aliases, so country, people and family
// pages all follow whatever these point at. Aliased to the raw --afh-color-*
// ramp they cannot follow the theme — the night block deliberately leaves that
// ramp alone — and toggling night gives a dark shell around parchment cards.
describe("fiche surface compatibility aliases (REQ-115)", () => {
  const countryCss = readFileSync(
    resolve(process.cwd(), "src/styles/country-tokens.css"),
    "utf8"
  );

  // Bound to the L2 semantic tokens, these follow the swap for free; bound to
  // the immutable ramp, they never can.
  const THEME_FOLLOWING_ALIASES = [
    "--country-bg",
    "--country-bg-warm",
    "--country-card",
    "--country-border",
    "--country-text",
    "--country-text-soft",
  ];

  function aliasTarget(name: string): string {
    const match = countryCss.match(
      new RegExp(`${name}:\\s*var\\((--[a-z0-9-]+)\\)`, "i")
    );
    if (!match) throw new Error(`Missing alias ${name}`);
    return match[1];
  }

  // @req REQ-115
  it.each(THEME_FOLLOWING_ALIASES)(
    "points %s at a token the night theme rebinds",
    (alias) => {
      const target = aliasTarget(alias);

      expect(target).not.toMatch(/^--afh-color-/);
      expect(nightScopeOf(colorCss)).toContain(`${target}:`);
    }
  );
});

// ESLint never parses .css, so afh/no-raw-font-size cannot reach these two
// files. They are where the country and people fiches keep their own type
// ladder, which is how those surfaces ended up a size behind the rest of the
// site — the very drift the ratchet exists to stop. This is the only guard
// they get, so it says both halves out loud: no literal sizes, and no
// breakpoint the system does not have.
describe("surface token files carry no second type scale", () => {
  const SURFACE_TOKEN_FILES = [
    "src/styles/country-tokens.css",
    "src/styles/people-tokens.css",
  ];

  /** The two widths the whole system steps at. Anything else is a third. */
  const SYSTEM_BREAKPOINTS = [768, 1200];

  // @req REQ-091
  it.each(SURFACE_TOKEN_FILES)(
    "declares no literal font-size in %s",
    (file) => {
      const css = readFileSync(resolve(process.cwd(), file), "utf8");
      const literals = [...css.matchAll(/font-size:\s*([^;]+);/g)]
        .map(([, value]) => value.trim())
        .filter((value) => /\d*\.?\d+(px|rem|em|pt)\b/.test(value));

      expect(literals).toEqual([]);
    }
  );

  // country-tokens.css stepped at 1280 while everything else stepped at 1200.
  // In that 80px band the etymology block held its tablet gutters while the
  // page around it had already widened.
  // @req REQ-091
  it.each(SURFACE_TOKEN_FILES)("steps only at 768 and 1200 in %s", (file) => {
    const css = readFileSync(resolve(process.cwd(), file), "utf8");
    const widths = [
      ...css.matchAll(/@media\s*\(\s*min-width:\s*(\d+)px\s*\)/g),
    ].map(([, px]) => Number(px));

    expect([...new Set(widths)].sort((a, b) => a - b)).toEqual(
      SYSTEM_BREAKPOINTS.filter((bp) => widths.includes(bp))
    );
  });

  // @req REQ-091
  it.each(SURFACE_TOKEN_FILES)(
    "aliases every type token in %s onto the afh scale",
    (file) => {
      const css = readFileSync(resolve(process.cwd(), file), "utf8");
      const declarations = [
        ...css.matchAll(
          /(--[a-z]+-text-(?:hero|h1|h2|h3|body|small|caption)):\s*([^;]+);/g
        ),
      ];

      for (const [, name, value] of declarations) {
        expect(value.trim(), name).toMatch(/^var\(--afh-text-[a-z0-9]+\)$/);
      }
    }
  );

  // The two roles the charter retired. Left aliased, a surface could keep
  // painting 9px text through a name that no longer means anything. Prose
  // about them is fine — the assertion is on declarations, not on mentions.
  // @req REQ-091
  it.each(SURFACE_TOKEN_FILES)(
    "declares no micro or nano token in %s",
    (file) => {
      const css = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(css).not.toMatch(/--[a-z]+-text-(?:micro|nano)\s*:/);
    }
  );
});

// The `.home-globe-morph` slider this file used to measure went with the
// point cloud (ETNI-1360). Its two flanking labels sat on a parchment pill
// and ETNI-1344 had to repoint them off --afh-text-muted to clear AA; the
// control no longer exists, and the surviving globe states its projection
// with a toolbar button on the night ground, whose ink is measured by the
// night-theme block below.

describe("night theme (REQ-115)", () => {
  const ground = () => tokenHex("--afh-night-ground");
  const surface = () => tokenHex("--afh-night-surface-2");

  // @req REQ-115
  it("keeps body and soft text AA-readable on both night surfaces", () => {
    for (const ink of ["--afh-night-ink", "--afh-night-ink-2"]) {
      expect(contrastRatio(tokenHex(ink), ground())).toBeGreaterThanOrEqual(
        4.5
      );
      expect(contrastRatio(tokenHex(ink), surface())).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });

  // --accent-ink was minted for text on the parchment tint, where dark is
  // what reads. On a night surface the same token is a dark ink on a dark
  // card — 2.47:1 to 2.73:1, worse than the fill it replaced. Night needs
  // its own half of the pair, or every accent-coloured label on a card
  // fails the moment the reader switches surface.
  // @req REQ-115
  it.each(["ocre", "teal", "terre", "perv"])(
    "keeps the %s accent ink AA-readable on both night surfaces",
    (accent) => {
      const ink = resolvedHex(`--afh-cat-${accent}-ink-night`);

      expect(contrastRatio(ink, surface())).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(ink, ground())).toBeGreaterThanOrEqual(4.5);
    }
  );

  // The night block has to actually bind them, or the tokens are decoration.
  // @req REQ-115
  it.each(["ocre", "teal", "terre", "perv"])(
    "binds --accent-ink to the %s night ink inside a night scope",
    (accent) => {
      const nightScope = nightScopeOf(colorCss);

      expect(nightScope).toContain(
        `--accent-ink: var(--afh-cat-${accent}-ink-night)`
      );
    }
  );

  // Every axis accent lands on the night ground in the hero band, so an
  // accent that fails there would take a whole axis down with it.
  // @req REQ-115
  it("keeps every access-mode accent AA-readable on the night ground", () => {
    for (const accent of [
      "--afh-cat-ocre",
      "--afh-cat-teal",
      "--afh-cat-perv",
    ]) {
      expect(contrastRatio(tokenHex(accent), ground())).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });

  // The theme swaps the semantic aliases, not the components: anything
  // that reads --afh-bg / --afh-text follows without being touched.
  // @req REQ-115
  it("rebinds the semantic surface and text aliases under .dark", () => {
    const darkBlock = colorCss.match(/\.dark[^{]*\{([^}]*)\}/);
    expect(darkBlock).not.toBeNull();

    for (const alias of [
      "--afh-bg",
      "--afh-bg-warm",
      "--afh-surface",
      "--afh-border",
      "--afh-text",
      "--afh-text-soft",
      "--afh-text-muted",
    ]) {
      expect(darkBlock![1]).toContain(`${alias}:`);
    }
  });

  // The hero band is night whatever the reader's page theme, so the two
  // have to be one rule — two copies would drift into two nights.
  // @req REQ-115
  it("applies the same night swap to a subtree scope as to the page", () => {
    expect(colorCss).toMatch(/\.dark,\s*\n\.afh-on-night\s*\{/);
  });

  // `color` is resolved once on body and inherited from there, so text that
  // never set its own colour ignores a token swap. The nav wordmark went
  // unreadable on the night band for exactly this reason.
  // @req REQ-115
  it("states an inherited colour on the night scope, not just tokens", () => {
    const darkBlock = colorCss.match(/\.dark[^{]*\{([^}]*)\}/);

    expect(darkBlock![1]).toMatch(/(^|\n)\s*color:\s*var\(--afh-text\);/);
  });
});

/**
 * The people fiche reads its accent links off a dedicated ink token rather than
 * the raw terracotta fill.
 *
 * The two differ because the fiche's reading ground is --afh-color-bg-warm
 * (#f5ede0), not the page parchment. Raw terracotta (#b64e27) reaches only
 * 4.39:1 there — axe-core reported it SERIOUS on nine People/FicheSections
 * stories at 430/720/1200px while every static gate stayed green.
 *
 * The sweep in textColorContrastSweep.test.ts cannot catch this by itself, for
 * two independent reasons: it scores a token by its *best* light ground, so
 * terracotta passes on white and never reports the warm ground it actually sits
 * on; and its regex reads only --afh-* tokens, never the --country-* aliases
 * that every fiche surface speaks. Hence this explicit pairing.
 */
describe("people fiche accent text on the warm parchment", () => {
  const countryCss = readFileSync(
    resolve(process.cwd(), "src/styles/country-tokens.css"),
    "utf8"
  );

  /** What a --country-* alias points at, so the ink resolves through color.css. */
  function countryAliasTarget(name: string): string {
    const match = countryCss.match(
      new RegExp(`${name}:\\s*var\\((--[a-z0-9-]+)\\)`, "i")
    );
    if (!match) throw new Error(`Missing country token ${name}`);
    return match[1];
  }

  /** The three day grounds a fiche reader ever sees body text on. */
  const DAY_GROUNDS = [
    "--afh-color-bg",
    "--afh-color-bg-warm",
    "--afh-color-card",
  ] as const;

  // @req REQ-090
  it("keeps the accent ink AA-readable on every day ground, warm included", () => {
    const ink = resolvedHex(countryAliasTarget("--country-terracotta-ink"));

    const shortfalls = DAY_GROUNDS.map((ground) => ({
      ground,
      ratio: contrastRatio(ink, tokenHex(ground)),
    })).filter((measured) => measured.ratio < 4.5);

    expect(
      shortfalls.map((s) => `${s.ground}: ${s.ratio.toFixed(2)}:1`)
    ).toEqual([]);
  });

  // The fill token stays what it is — a 4.39:1 terracotta is correct for a
  // progress bar, which is non-text content at 3:1, and wrong for a link.
  // @req REQ-090
  it("keeps the raw terracotta out of text colour on the people fiche", () => {
    const peopleComponents = [
      "src/components/people/PeopleLanguageSection.tsx",
      "src/components/people/PeopleCountriesSection.tsx",
    ];

    const textUses = peopleComponents.flatMap((file) =>
      readFileSync(resolve(process.cwd(), file), "utf8")
        .split("\n")
        .map((line, index) => ({ file, line: index + 1, text: line }))
        .filter(({ text }) =>
          /(?<![a-z-])color:\s*"var\(--country-terracotta\)"/.test(text)
        )
        .map(({ file: f, line }) => `${f}:${line}`)
    );

    expect(textUses).toEqual([]);
  });
});

/**
 * Text is softened with an ink, never with `opacity`.
 *
 * `opacity` composites the whole glyph toward whatever is behind it, so it
 * scales contrast down by roughly the same factor: the home's "Saviez-vous"
 * entity chip set --accent-ink at 0.72, which turns the ocre ink (#835514,
 * 6.41:1 on a card) into #a68556 — 3.45:1, and axe-core reported it on the
 * live /fr route.
 *
 * The tier line directly beneath it in the same component already records the
 * rule this encodes: a label a reader is meant to read is content, and content
 * takes an ink that clears AA. Size, weight, letter-spacing and case are what
 * carry the hierarchy.
 */
describe("home did-you-know chip softens with ink, not opacity", () => {
  const didYouKnow = readFileSync(
    resolve(process.cwd(), "src/components/home/DidYouKnow.tsx"),
    "utf8"
  );

  /** The declarations inside one styled-jsx rule, by selector. */
  function ruleBody(selector: string): string {
    const match = didYouKnow.match(
      new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`, "i")
    );
    if (!match) throw new Error(`Missing rule ${selector}`);
    return match[1];
  }

  // @req REQ-090
  it("does not fade the entity-kind label below its ink", () => {
    expect(ruleBody(".home-dyk-chip-kind")).not.toMatch(/opacity:\s*0?\.\d+/);
  });
});
