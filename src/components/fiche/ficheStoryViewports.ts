/**
 * Storybook harness shared by the fiche panel stories (ETNI-938).
 *
 * Every panel is proofed at the three project fiche breakpoints. Declaring the
 * viewport set once and deriving a panel's three named exports from a single
 * base story keeps each story file down to the props under proof, instead of
 * three near-identical objects per panel.
 */

/** Project fiche breakpoints: mobile 430 · tablet md 720 · desktop xl 800. */
export const FICHE_VIEWPORTS = {
  ficheMobile430: {
    name: "Fiche — mobile 430 px",
    styles: { width: "430px", height: "1200px" },
  },
  ficheTablet720: {
    name: "Fiche — tablet 720 px",
    styles: { width: "720px", height: "1200px" },
  },
  ficheDesktop800: {
    name: "Fiche — desktop 800 px",
    styles: { width: "800px", height: "1200px" },
  },
};

export type FicheBreakpoint = keyof typeof FICHE_VIEWPORTS;

/**
 * Same axe tag set `scripts/a11y-test.ts` audits with, so a panel that passes
 * in the Storybook a11y panel is passing the check that actually gates CI.
 */
export const FICHE_A11Y_PARAMETERS = {
  options: {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    },
  },
};

interface BaseStory {
  parameters?: Record<string, unknown>;
}

/**
 * Pins a base story to one fiche breakpoint. The result is assigned to a named
 * export (CSF requires one per story), which is also where the story gets its
 * displayed name — the CSF indexer reads exports statically and cannot see a
 * `name` set inside a helper's return value.
 */
export function atFicheBreakpoint<TStory extends BaseStory>(
  base: TStory,
  breakpoint: FicheBreakpoint
): TStory {
  return {
    ...base,
    parameters: {
      ...base.parameters,
      viewport: { defaultViewport: breakpoint },
    },
  };
}
