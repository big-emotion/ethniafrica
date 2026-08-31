import type { Meta, StoryObj } from "@storybook/react";

import { ImposedNameList } from "./ImposedNameList";
import { mapImposedNames } from "./imposedNames";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import {
  SONINKE_WITHOUT_IMPOSED_NAME,
  YORUBA_WITH_IMPOSED_NAME,
} from "./__tests__/imposedNamesFixtures";

const meta = {
  title: "Colonization/ImposedNameList",
  component: ImposedNameList,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof ImposedNameList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One documented imposed-name record, endonym paired with imposed name (illustrative, not data). */
const populated: Story = {
  args: {
    items: mapImposedNames([YORUBA_WITH_IMPOSED_NAME]),
  },
};

/** No Epic 8 imposed-name record for any people in scope — renders nothing, no empty shell. */
const empty: Story = {
  args: {
    items: mapImposedNames([SONINKE_WITHOUT_IMPOSED_NAME]),
  },
};

// @req REQ-104
export const PopulatedMobile430 = atFicheBreakpoint(
  populated,
  "ficheMobile430"
);
// @req REQ-104
export const PopulatedTablet720 = atFicheBreakpoint(
  populated,
  "ficheTablet720"
);
// @req REQ-104
export const PopulatedDesktop800 = atFicheBreakpoint(
  populated,
  "ficheDesktop800"
);

// @req REQ-104
export const EmptyMobile430 = atFicheBreakpoint(empty, "ficheMobile430");
// @req REQ-104
export const EmptyTablet720 = atFicheBreakpoint(empty, "ficheTablet720");
// @req REQ-104
export const EmptyDesktop800 = atFicheBreakpoint(empty, "ficheDesktop800");
