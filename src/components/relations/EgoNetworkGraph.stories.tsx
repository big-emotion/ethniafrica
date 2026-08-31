import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import {
  EgoNetworkGraph,
  type EgoNetworkGraphProps,
} from "@/components/relations/EgoNetworkGraph";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import { RELATIONS_LIST_ITEMS } from "@/components/relations/__tests__/relationsStoryFixtures";
import type { RelationListItem } from "@/lib/relationsDataTransformer";

const CENTER = { id: "PPL_YORUBA", nameMain: "Yoruba" };

/** Demonstrates the 24-neighbor cap + overflow affordance (illustrative, not data). */
const MANY_RELATIONS_ITEMS: RelationListItem[] = Array.from(
  { length: 26 },
  (_, index) => ({
    id: `REL_ILLUSTRATIVE_${index}`,
    type: (["migratory", "commercial", "religious"] as const)[index % 3],
    derived: false,
    neighbor: {
      id: `PPL_ILLUSTRATIVE_${index}`,
      nameMain: `Peuple ${index + 1}`,
      languageFamilyId: "FLG_NIGER_CONGO",
    },
    period: null,
    description: null,
    confidence: { score: 60, sourceCount: 1 },
  })
);

const meta = {
  title: "Relations/EgoNetworkGraph",
  component: EgoNetworkGraph,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof EgoNetworkGraph>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Small ego network, sourced + derived edges (illustrative, not data). */
const populated: Story = {
  args: {
    center: CENTER,
    edges: RELATIONS_LIST_ITEMS,
    onEdgeActivate: () => {},
    onNodeActivate: () => {},
  },
};

/** 26 relations — the 24-neighbor cap applies, with a "+2 autres" overflow affordance (illustrative, not data). */
const cappedWithOverflow: Story = {
  args: {
    center: CENTER,
    edges: MANY_RELATIONS_ITEMS,
    onEdgeActivate: () => {},
    onNodeActivate: () => {},
  },
};

/**
 * No `@storybook/testing-library` play-function dependency in this project
 * yet, so the keyboard-focused state is reproduced with a plain
 * `dispatchEvent` on mount — an Arrow Right lands focus on the first edge,
 * exercising the same axe-core pass the CI gate runs against the default
 * state (module spec §UX & Components: "keyboard-focus states").
 */
function KeyboardFocusedGraph(props: EgoNetworkGraphProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const application = containerRef.current?.querySelector(
      '[role="application"]'
    );
    application?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
  }, []);

  return (
    <div ref={containerRef}>
      <EgoNetworkGraph {...props} />
    </div>
  );
}

const keyboardFocused: Story = {
  render: (args) => (
    <KeyboardFocusedGraph {...(args as EgoNetworkGraphProps)} />
  ),
  args: {
    center: CENTER,
    edges: RELATIONS_LIST_ITEMS,
    onEdgeActivate: () => {},
    onNodeActivate: () => {},
  },
};

/**
 * `prefers-reduced-motion: reduce` — no Storybook media-emulation addon is
 * installed in this project, so the mount-fade token is overridden inline as
 * a documentation aid; the real contract lives in `motion.css` and is
 * exercised by `EgoNetworkGraph.test.tsx` (UX-DR4).
 */
const reducedMotion: Story = {
  args: {
    center: CENTER,
    edges: RELATIONS_LIST_ITEMS,
    onEdgeActivate: () => {},
    onNodeActivate: () => {},
  },
  decorators: [
    (StoryComponent) => (
      <div style={{ ["--afh-duration-fade" as string]: "0.01ms" }}>
        <StoryComponent />
      </div>
    ),
  ],
};

// @req REQ-097
export const PopulatedMobile430 = atFicheBreakpoint(
  populated,
  "ficheMobile430"
);
// @req REQ-097
export const PopulatedTablet720 = atFicheBreakpoint(
  populated,
  "ficheTablet720"
);
// @req REQ-097
export const PopulatedDesktop800 = atFicheBreakpoint(
  populated,
  "ficheDesktop800"
);

// @req REQ-097
export const CappedOverflowMobile430 = atFicheBreakpoint(
  cappedWithOverflow,
  "ficheMobile430"
);
// @req REQ-097
export const CappedOverflowTablet720 = atFicheBreakpoint(
  cappedWithOverflow,
  "ficheTablet720"
);
// @req REQ-097
export const CappedOverflowDesktop800 = atFicheBreakpoint(
  cappedWithOverflow,
  "ficheDesktop800"
);

// @req REQ-097
export const KeyboardFocusedMobile430 = atFicheBreakpoint(
  keyboardFocused,
  "ficheMobile430"
);
// @req REQ-097
export const KeyboardFocusedTablet720 = atFicheBreakpoint(
  keyboardFocused,
  "ficheTablet720"
);
// @req REQ-097
export const KeyboardFocusedDesktop800 = atFicheBreakpoint(
  keyboardFocused,
  "ficheDesktop800"
);

// @req REQ-097
export const ReducedMotionMobile430 = atFicheBreakpoint(
  reducedMotion,
  "ficheMobile430"
);
// @req REQ-097
export const ReducedMotionTablet720 = atFicheBreakpoint(
  reducedMotion,
  "ficheTablet720"
);
// @req REQ-097
export const ReducedMotionDesktop800 = atFicheBreakpoint(
  reducedMotion,
  "ficheDesktop800"
);
