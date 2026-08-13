import type { Meta, StoryObj } from "@storybook/react";

import { RelationsList } from "@/components/relations/RelationsList";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import {
  DERIVED_LINGUISTIC_ITEM,
  RELATIONS_LIST_ITEMS,
} from "@/components/relations/__tests__/relationsStoryFixtures";

const meta = {
  title: "Relations/RelationsList",
  component: RelationsList,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof RelationsList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sourced + derived relations, unfiltered (illustrative, not data). */
const populated: Story = {
  args: {
    items: RELATIONS_LIST_ITEMS,
    onOpenRelation: () => {},
  },
};

/** Same corpus, arriving with a filter already active from the URL (illustrative, not data). */
const filtered: Story = {
  args: {
    items: RELATIONS_LIST_ITEMS,
    onOpenRelation: () => {},
    initialActiveTypes: ["migratory"],
  },
};

/** No relations documented yet — calm empty state (UX-DR31). */
const empty: Story = {
  args: {
    items: [],
    onOpenRelation: () => {},
  },
};

/** Only AFRIK-derived linguistic proximity, no sourced relations yet (UX-DR31). */
const derivedOnly: Story = {
  args: {
    items: [DERIVED_LINGUISTIC_ITEM],
    onOpenRelation: () => {},
  },
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
export const FilteredMobile430 = atFicheBreakpoint(filtered, "ficheMobile430");
// @req REQ-097
export const FilteredTablet720 = atFicheBreakpoint(filtered, "ficheTablet720");
// @req REQ-097
export const FilteredDesktop800 = atFicheBreakpoint(
  filtered,
  "ficheDesktop800"
);

// @req REQ-097
export const EmptyMobile430 = atFicheBreakpoint(empty, "ficheMobile430");
// @req REQ-097
export const EmptyTablet720 = atFicheBreakpoint(empty, "ficheTablet720");
// @req REQ-097
export const EmptyDesktop800 = atFicheBreakpoint(empty, "ficheDesktop800");

// @req REQ-097
export const DerivedOnlyMobile430 = atFicheBreakpoint(
  derivedOnly,
  "ficheMobile430"
);
// @req REQ-097
export const DerivedOnlyTablet720 = atFicheBreakpoint(
  derivedOnly,
  "ficheTablet720"
);
// @req REQ-097
export const DerivedOnlyDesktop800 = atFicheBreakpoint(
  derivedOnly,
  "ficheDesktop800"
);
